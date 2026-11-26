from typing import List, Dict, Any, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.customer import Customer, CustomerAddress
from app.models.order import Order
from app.models.user import User
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerAddressCreate,
    CustomerAddressUpdate,
    CustomerAddressResponse,
    CustomerOrderSummary,
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/customers", tags=["Clientes (CRM)"])


def _verify_tenant_access(user: User, tenant_id: Any):
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a esta loja.")


def _normalize_person_type(val: Optional[str]) -> str:
    if not val:
        return "PF"
    up = val.strip().upper()
    if up in ("PJ", "COMPANY"):
        return "PJ"
    return "PF"


def _build_customer_response(customer: Customer, include_orders: bool = False) -> CustomerResponse:
    orders = list(customer.orders or [])
    orders_count = len(orders)
    total_spent = sum((Decimal(str(o.total_amount or 0)) for o in orders), Decimal("0.00"))
    last_order_at = max((o.created_at for o in orders), default=None)

    addresses = list(customer.addresses or [])
    default_addr = next((a for a in addresses if a.is_default), addresses[0] if addresses else None)

    sorted_orders = sorted(orders, key=lambda o: o.created_at, reverse=True)

    return CustomerResponse(
        id=customer.id,
        tenant_id=customer.tenant_id,
        person_type=customer.person_type,
        full_name=customer.full_name,
        company_name=customer.company_name,
        tax_id=customer.tax_id,
        state_tax_id=customer.state_tax_id,
        email=customer.email,
        phone=customer.phone or "",
        birth_date=customer.birth_date,
        notes=customer.notes,
        tags=list(customer.tags or []),
        created_at=customer.created_at,
        updated_at=customer.updated_at,
        addresses=[CustomerAddressResponse.model_validate(a) for a in addresses],
        orders_count=orders_count,
        total_spent=total_spent,
        last_order_at=last_order_at,
        default_city=default_addr.city if default_addr else None,
        default_state=default_addr.state if default_addr else None,
        orders=[CustomerOrderSummary.model_validate(o) for o in sorted_orders] if include_orders else [],
    )


async def _check_unique_customer_fields(
    db: AsyncSession,
    tenant_id: Any,
    email: Optional[str],
    tax_id: Optional[str],
    exclude_id: Optional[UUID] = None,
):
    if email and email.strip():
        stmt = select(Customer.id).where(
            Customer.tenant_id == tenant_id,
            Customer.email == email.strip().lower(),
        )
        if exclude_id:
            stmt = stmt.where(Customer.id != exclude_id)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Já existe um cliente com este e-mail nesta loja.")

    if tax_id and tax_id.strip():
        stmt = select(Customer.id).where(
            Customer.tenant_id == tenant_id,
            Customer.tax_id == tax_id.strip(),
        )
        if exclude_id:
            stmt = stmt.where(Customer.id != exclude_id)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Já existe um cliente com este CPF/CNPJ nesta loja.")


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    person_type: Optional[str] = None,
    recurring: Optional[bool] = None,
    search: Optional[str] = None,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Lista clientes da loja com métricas (pedidos, LTV e cidade principal)."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Customer)
        .options(selectinload(Customer.addresses), selectinload(Customer.orders))
        .where(Customer.tenant_id == tenant_id)
        .order_by(desc(Customer.created_at))
    )

    if person_type:
        stmt = stmt.where(Customer.person_type == _normalize_person_type(person_type))

    customers = (await db.execute(stmt)).scalars().all()
    results = [_build_customer_response(c, include_orders=False) for c in customers]

    if recurring:
        results = [r for r in results if r.orders_count >= 2]

    if search and search.strip():
        q = search.strip().lower()
        results = [
            r
            for r in results
            if q in (r.full_name or "").lower()
            or q in (r.company_name or "").lower()
            or q in (r.email or "").lower()
            or q in (r.tax_id or "").lower()
            or q in (r.phone or "").lower()
        ]

    return results


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer_detail(
    customer_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Customer)
        .options(selectinload(Customer.addresses), selectinload(Customer.orders))
        .where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado nesta loja.")

    return _build_customer_response(customer, include_orders=True)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    clean_email = payload.email.strip().lower() if payload.email else None
    clean_tax = payload.tax_id.strip() if payload.tax_id else None
    await _check_unique_customer_fields(db, tenant_id, clean_email, clean_tax)

    customer = Customer(
        tenant_id=tenant_id,
        person_type=_normalize_person_type(payload.person_type),
        full_name=payload.full_name.strip(),
        company_name=payload.company_name.strip() if payload.company_name else None,
        tax_id=clean_tax,
        state_tax_id=payload.state_tax_id.strip() if payload.state_tax_id else None,
        email=clean_email,
        phone=payload.phone.strip(),
        birth_date=payload.birth_date,
        notes=payload.notes.strip() if payload.notes else None,
        tags=list(payload.tags or []),
    )
    db.add(customer)
    await db.flush()

    if payload.address:
        addr_data = payload.address.model_dump()
        addr_data["is_default"] = True
        db.add(CustomerAddress(tenant_id=tenant_id, customer_id=customer.id, **addr_data))

    await db.commit()
    res = await db.execute(
        select(Customer)
        .options(selectinload(Customer.addresses), selectinload(Customer.orders))
        .where(Customer.id == customer.id, Customer.tenant_id == tenant_id)
    )
    return _build_customer_response(res.scalar_one(), include_orders=True)


@router.put("/{customer_id}", response_model=CustomerResponse)
@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Customer)
        .options(selectinload(Customer.addresses), selectinload(Customer.orders))
        .where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if "person_type" in data:
        data["person_type"] = _normalize_person_type(data["person_type"])
    if "email" in data and data["email"]:
        data["email"] = data["email"].strip().lower()
    if "tax_id" in data and data["tax_id"]:
        data["tax_id"] = data["tax_id"].strip()

    await _check_unique_customer_fields(
        db,
        tenant_id,
        data.get("email"),
        data.get("tax_id"),
        exclude_id=customer_id,
    )

    for key, val in data.items():
        setattr(customer, key, val)

    await db.commit()
    res = await db.execute(
        select(Customer)
        .options(selectinload(Customer.addresses), selectinload(Customer.orders))
        .where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
    )
    return _build_customer_response(res.scalar_one(), include_orders=True)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    customer = (
        await db.execute(
            select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    # Desvincula pedidos para preservar o histórico financeiro/produção
    await db.execute(
        update(Order)
        .where(Order.tenant_id == tenant_id, Order.customer_id == customer_id)
        .values(customer_id=None)
    )
    await db.delete(customer)
    await db.commit()
    return None


@router.post("/{customer_id}/addresses", response_model=CustomerAddressResponse, status_code=status.HTTP_201_CREATED)
async def add_customer_address(
    customer_id: UUID,
    payload: CustomerAddressCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    customer = (
        await db.execute(
            select(Customer)
            .options(selectinload(Customer.addresses))
            .where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    make_default = payload.is_default or len(customer.addresses) == 0
    if make_default:
        await db.execute(
            update(CustomerAddress)
            .where(CustomerAddress.tenant_id == tenant_id, CustomerAddress.customer_id == customer_id)
            .values(is_default=False)
        )

    addr_data = payload.model_dump()
    addr_data["is_default"] = make_default
    addr_data["state"] = addr_data["state"].upper()
    addr = CustomerAddress(tenant_id=tenant_id, customer_id=customer_id, **addr_data)
    db.add(addr)
    await db.commit()
    await db.refresh(addr)
    return CustomerAddressResponse.model_validate(addr)


@router.put("/{customer_id}/addresses/{address_id}", response_model=CustomerAddressResponse)
@router.patch("/{customer_id}/addresses/{address_id}", response_model=CustomerAddressResponse)
async def update_customer_address(
    customer_id: UUID,
    address_id: UUID,
    payload: CustomerAddressUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    addr = (
        await db.execute(
            select(CustomerAddress).where(
                CustomerAddress.id == address_id,
                CustomerAddress.customer_id == customer_id,
                CustomerAddress.tenant_id == tenant_id,
            )
        )
    ).scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Endereço não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_default"):
        await db.execute(
            update(CustomerAddress)
            .where(CustomerAddress.tenant_id == tenant_id, CustomerAddress.customer_id == customer_id)
            .values(is_default=False)
        )
    if "state" in data and data["state"]:
        data["state"] = data["state"].upper()

    for key, val in data.items():
        setattr(addr, key, val)

    await db.commit()
    await db.refresh(addr)
    return CustomerAddressResponse.model_validate(addr)


@router.delete("/{customer_id}/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_address(
    customer_id: UUID,
    address_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    addr = (
        await db.execute(
            select(CustomerAddress).where(
                CustomerAddress.id == address_id,
                CustomerAddress.customer_id == customer_id,
                CustomerAddress.tenant_id == tenant_id,
            )
        )
    ).scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Endereço não encontrado.")

    was_default = addr.is_default
    await db.delete(addr)
    await db.flush()

    if was_default:
        next_addr = (
            await db.execute(
                select(CustomerAddress)
                .where(CustomerAddress.tenant_id == tenant_id, CustomerAddress.customer_id == customer_id)
                .limit(1)
            )
        ).scalar_one_or_none()
        if next_addr:
            next_addr.is_default = True

    await db.commit()
    return None
