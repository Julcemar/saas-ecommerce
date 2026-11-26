import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.middleware.tenant import get_current_tenant
from app.models.customer import Customer, CustomerAddress
from app.models.order import Order
from app.schemas.customer import (
    CustomerAddressCreate,
    CustomerAddressUpdate,
    CustomerAddressResponse,
)
from app.schemas.order import OrderResponse
from app.schemas.storefront_auth import (
    StorefrontCustomerRegister,
    StorefrontCustomerLogin,
    StorefrontForgotPasswordRequest,
    StorefrontResetPasswordRequest,
    StorefrontCustomerProfile,
    StorefrontCustomerTokenResponse,
    StorefrontCustomerUpdate,
    StorefrontPasswordUpdate,
    only_digits,
    is_valid_cpf,
    is_valid_cnpj,
    format_cpf_cnpj,
)
from app.security.auth import (
    CUSTOMER_COOKIE_NAME,
    create_access_token,
    get_password_hash,
    require_customer,
    verify_password,
)

router = APIRouter(prefix="/storefront", tags=["Autenticação e Conta do Cliente"])


def _set_customer_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=CUSTOMER_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def _clear_customer_cookie(response: Response) -> None:
    response.delete_cookie(key=CUSTOMER_COOKIE_NAME, path="/")


def _issue_customer_token(customer: Customer, tenant_dict: Dict[str, Any]) -> str:
    return create_access_token({
        "sub": str(customer.id),
        "email": customer.email,
        "role": "CUSTOMER",
        "token_type": "customer",
        "tenant_id": str(tenant_dict["id"]),
        "tenant_slug": tenant_dict["slug"],
    })


async def _load_customer_with_addresses(db: AsyncSession, customer_id: Any, tenant_id: Any) -> Customer:
    stmt = (
        select(Customer)
        .options(selectinload(Customer.addresses))
        .where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
    )
    return (await db.execute(stmt)).scalar_one()


@router.post("/auth/register", response_model=StorefrontCustomerTokenResponse, status_code=status.HTTP_201_CREATED)
async def storefront_register(
    payload: StorefrontCustomerRegister,
    response: Response,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    clean_email = payload.email.strip().lower()
    clean_tax_digits = only_digits(payload.tax_id)
    formatted_tax = format_cpf_cnpj(clean_tax_digits, payload.person_type)

    # Verifica unicidade de e-mail dentro do tenant
    existing_email_stmt = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.email == clean_email,
    )
    existing_by_email = (await db.execute(existing_email_stmt)).scalar_one_or_none()

    if existing_by_email and existing_by_email.password_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta cadastrada com este e-mail nesta loja.",
        )

    # Verifica unicidade de CPF/CNPJ dentro do tenant (comparando formatado ou apenas dígitos)
    all_tax_stmt = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.tax_id.is_not(None),
    )
    for cust_row in (await db.execute(all_tax_stmt)).scalars().all():
        if only_digits(cust_row.tax_id or "") == clean_tax_digits:
            if existing_by_email and cust_row.id == existing_by_email.id:
                continue
            if cust_row.password_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Já existe uma conta cadastrada com este CPF/CNPJ nesta loja.",
                )
            elif not existing_by_email:
                # Reaproveita registro guest sem senha se tiver o mesmo documento
                existing_by_email = cust_row

    pwd_hash = get_password_hash(payload.password)

    if existing_by_email:
        # Ativa conta de cliente que comprou anteriormente sem senha (guest checkout)
        existing_by_email.person_type = payload.person_type
        existing_by_email.full_name = payload.full_name.strip()
        existing_by_email.company_name = payload.company_name.strip() if payload.company_name else None
        existing_by_email.tax_id = formatted_tax
        existing_by_email.state_tax_id = payload.state_tax_id.strip() if payload.state_tax_id else None
        existing_by_email.phone = payload.phone.strip()
        existing_by_email.email = clean_email
        existing_by_email.password_hash = pwd_hash
        existing_by_email.is_active = True
        existing_by_email.last_login_at = datetime.utcnow()
        customer = existing_by_email
    else:
        customer = Customer(
            tenant_id=tenant_id,
            person_type=payload.person_type,
            full_name=payload.full_name.strip(),
            company_name=payload.company_name.strip() if payload.company_name else None,
            tax_id=formatted_tax,
            state_tax_id=payload.state_tax_id.strip() if payload.state_tax_id else None,
            email=clean_email,
            phone=payload.phone.strip(),
            password_hash=pwd_hash,
            is_active=True,
            last_login_at=datetime.utcnow(),
        )
        db.add(customer)

    await db.commit()
    customer_full = await _load_customer_with_addresses(db, customer.id, tenant_id)
    token = _issue_customer_token(customer_full, tenant_dict)
    _set_customer_cookie(response, token)

    return StorefrontCustomerTokenResponse(
        access_token=token,
        token_type="bearer",
        tenant_slug=tenant_dict["slug"],
        customer=StorefrontCustomerProfile.model_validate(customer_full),
    )


@router.post("/auth/login", response_model=StorefrontCustomerTokenResponse)
async def storefront_login(
    payload: StorefrontCustomerLogin,
    response: Response,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    clean_email = payload.email.strip().lower()

    stmt = (
        select(Customer)
        .options(selectinload(Customer.addresses))
        .where(
            Customer.tenant_id == tenant_id,
            Customer.email == clean_email,
            Customer.is_active == True,
        )
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()

    if not customer or not customer.password_hash or not verify_password(payload.password, customer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        )

    customer.last_login_at = datetime.utcnow()
    await db.commit()

    token = _issue_customer_token(customer, tenant_dict)
    _set_customer_cookie(response, token)

    return StorefrontCustomerTokenResponse(
        access_token=token,
        token_type="bearer",
        tenant_slug=tenant_dict["slug"],
        customer=StorefrontCustomerProfile.model_validate(customer),
    )


@router.post("/auth/logout")
async def storefront_logout(response: Response):
    _clear_customer_cookie(response)
    return {"status": "ok", "message": "Sessão encerrada com sucesso."}


@router.post("/auth/forgot-password")
async def storefront_forgot_password(
    payload: StorefrontForgotPasswordRequest,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    clean_email = payload.email.strip().lower()

    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.email == clean_email,
        Customer.is_active == True,
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()

    dev_reset_token = None
    if customer:
        token = secrets.token_urlsafe(32)
        customer.reset_token = token
        customer.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)
        await db.commit()
        if settings.ENVIRONMENT != "production":
            dev_reset_token = token

    resp: Dict[str, Any] = {
        "status": "ok",
        "message": "Se o e-mail estiver cadastrado nesta loja, você receberá as instruções para redefinir sua senha.",
    }
    if dev_reset_token:
        resp["dev_reset_token"] = dev_reset_token
    return resp


@router.post("/auth/reset-password")
async def storefront_reset_password(
    payload: StorefrontResetPasswordRequest,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id,
        Customer.reset_token == payload.token.strip(),
        Customer.is_active == True,
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()

    if not customer or not customer.reset_token_expires_at or customer.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de recuperação inválido ou expirado.",
        )

    customer.password_hash = get_password_hash(payload.new_password)
    customer.reset_token = None
    customer.reset_token_expires_at = None
    await db.commit()

    return {"status": "ok", "message": "Senha redefinida com sucesso! Você já pode fazer login."}


@router.get("/me", response_model=StorefrontCustomerProfile)
async def storefront_get_me(
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    customer_full = await _load_customer_with_addresses(db, customer.id, tenant_dict["id"])
    return StorefrontCustomerProfile.model_validate(customer_full)


@router.put("/me", response_model=StorefrontCustomerProfile)
async def storefront_update_me(
    payload: StorefrontCustomerUpdate,
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    next_person_type = (payload.person_type or customer.person_type or "PF").upper()
    if next_person_type not in ("PF", "PJ"):
        raise HTTPException(status_code=400, detail="Tipo de pessoa inválido. Utilize PF ou PJ.")

    if payload.tax_id is not None:
        digits = only_digits(payload.tax_id)
        if next_person_type == "PF" and not is_valid_cpf(digits):
            raise HTTPException(status_code=400, detail="CPF inválido.")
        if next_person_type == "PJ" and not is_valid_cnpj(digits):
            raise HTTPException(status_code=400, detail="CNPJ inválido.")

        # Verifica duplicidade de CPF/CNPJ no mesmo tenant
        all_tax_stmt = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.id != customer.id,
            Customer.tax_id.is_not(None),
        )
        for other in (await db.execute(all_tax_stmt)).scalars().all():
            if only_digits(other.tax_id or "") == digits:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este CPF/CNPJ já está vinculado a outro cadastro nesta loja.",
                )
        customer.tax_id = format_cpf_cnpj(digits, next_person_type)

    customer.person_type = next_person_type
    if payload.full_name is not None:
        customer.full_name = payload.full_name.strip()
    if payload.company_name is not None:
        customer.company_name = payload.company_name.strip() or None
    if payload.state_tax_id is not None:
        customer.state_tax_id = payload.state_tax_id.strip() or None
    if payload.phone is not None:
        customer.phone = payload.phone.strip()
    if payload.birth_date is not None:
        customer.birth_date = payload.birth_date

    await db.commit()
    customer_full = await _load_customer_with_addresses(db, customer.id, tenant_id)
    return StorefrontCustomerProfile.model_validate(customer_full)


@router.put("/me/password")
async def storefront_update_password(
    payload: StorefrontPasswordUpdate,
    customer: Customer = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    if not customer.password_hash or not verify_password(payload.current_password, customer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha atual informada está incorreta.",
        )

    customer.password_hash = get_password_hash(payload.new_password)
    await db.commit()
    return {"status": "ok", "message": "Senha alterada com sucesso."}


# ----------------------------------------------------------------------------
# ENDEREÇOS DO CLIENTE (/api/storefront/me/addresses)
# ----------------------------------------------------------------------------
@router.get("/me/addresses", response_model=List[CustomerAddressResponse])
async def storefront_list_addresses(
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CustomerAddress)
        .where(
            CustomerAddress.tenant_id == tenant_dict["id"],
            CustomerAddress.customer_id == customer.id,
        )
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [CustomerAddressResponse.model_validate(r) for r in rows]


@router.post("/me/addresses", response_model=CustomerAddressResponse, status_code=status.HTTP_201_CREATED)
async def storefront_create_address(
    payload: CustomerAddressCreate,
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    existing_stmt = select(CustomerAddress).where(
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.customer_id == customer.id,
    )
    existing_addresses = (await db.execute(existing_stmt)).scalars().all()

    should_be_default = payload.is_default or len(existing_addresses) == 0
    if should_be_default:
        for addr in existing_addresses:
            addr.is_default = False

    new_addr = CustomerAddress(
        tenant_id=tenant_id,
        customer_id=customer.id,
        label=payload.label or "Principal",
        address_type=payload.address_type or "shipping",
        postal_code=payload.postal_code.strip(),
        street=payload.street.strip(),
        number=payload.number.strip(),
        complement=payload.complement.strip() if payload.complement else None,
        neighborhood=payload.neighborhood.strip(),
        city=payload.city.strip(),
        state=payload.state.strip().upper(),
        country=payload.country or "BR",
        is_default=should_be_default,
    )
    db.add(new_addr)
    await db.commit()
    await db.refresh(new_addr)
    return CustomerAddressResponse.model_validate(new_addr)


@router.put("/me/addresses/{address_id}", response_model=CustomerAddressResponse)
async def storefront_update_address(
    address_id: UUID,
    payload: CustomerAddressUpdate,
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    stmt = select(CustomerAddress).where(
        CustomerAddress.id == address_id,
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.customer_id == customer.id,
    )
    addr = (await db.execute(stmt)).scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Endereço não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if data.get("is_default") is True:
        other_stmt = select(CustomerAddress).where(
            CustomerAddress.tenant_id == tenant_id,
            CustomerAddress.customer_id == customer.id,
            CustomerAddress.id != address_id,
        )
        for other in (await db.execute(other_stmt)).scalars().all():
            other.is_default = False

    for k, v in data.items():
        if k == "state" and isinstance(v, str):
            v = v.strip().upper()
        elif isinstance(v, str):
            v = v.strip()
        setattr(addr, k, v)

    await db.commit()
    await db.refresh(addr)
    return CustomerAddressResponse.model_validate(addr)


@router.delete("/me/addresses/{address_id}")
async def storefront_delete_address(
    address_id: UUID,
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    stmt = select(CustomerAddress).where(
        CustomerAddress.id == address_id,
        CustomerAddress.tenant_id == tenant_id,
        CustomerAddress.customer_id == customer.id,
    )
    addr = (await db.execute(stmt)).scalar_one_or_none()
    if not addr:
        raise HTTPException(status_code=404, detail="Endereço não encontrado.")

    was_default = addr.is_default
    await db.delete(addr)
    await db.flush()

    if was_default:
        fallback_stmt = (
            select(CustomerAddress)
            .where(
                CustomerAddress.tenant_id == tenant_id,
                CustomerAddress.customer_id == customer.id,
            )
            .order_by(CustomerAddress.created_at.asc())
        )
        first_other = (await db.execute(fallback_stmt)).scalars().first()
        if first_other:
            first_other.is_default = True

    await db.commit()
    return {"status": "ok", "message": "Endereço removido."}


# ----------------------------------------------------------------------------
# PEDIDOS DO CLIENTE (/api/storefront/me/orders)
# ----------------------------------------------------------------------------
@router.get("/me/orders", response_model=List[OrderResponse])
async def storefront_list_my_orders(
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.history))
        .where(
            Order.tenant_id == tenant_dict["id"],
            Order.customer_id == customer.id,
        )
        .order_by(desc(Order.created_at))
    )
    orders = (await db.execute(stmt)).scalars().all()
    return [OrderResponse.model_validate(o) for o in orders]


@router.get("/me/orders/{order_id}", response_model=OrderResponse)
async def storefront_get_my_order(
    order_id: UUID,
    customer: Customer = Depends(require_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.history))
        .where(
            Order.id == order_id,
            Order.tenant_id == tenant_dict["id"],
            Order.customer_id == customer.id,
        )
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado nesta loja.")
    return OrderResponse.model_validate(order)
