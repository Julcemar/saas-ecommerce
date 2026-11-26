import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.tenant import Tenant
from app.models.product import Product, ProductWholesaleTier, ProductCustomizationField
from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderHistory
from app.schemas.order import OrderCreate


def calculate_tier_price(base_price: Decimal, tiers: List[Any], quantity: int) -> Decimal:
    """
    Calcula o preço unitário do produto baseado nas faixas de atacado progressivo.
    Se a quantidade atingir uma faixa com min_quantity, aplica o unit_price dessa faixa.
    """
    applicable_price = base_price

    if tiers:
        sorted_tiers = sorted(tiers, key=lambda t: t.min_quantity)
        for tier in sorted_tiers:
            if quantity >= tier.min_quantity:
                applicable_price = tier.unit_price

    return Decimal(str(applicable_price))


async def create_order_in_db(
    db: AsyncSession,
    tenant_id: str,
    order_data: OrderCreate,
    authenticated_customer: Customer = None,
) -> Order:
    # 1. Validação e cálculo dos itens com isolamento de tenant
    order_items_to_create = []
    items_subtotal = Decimal("0.00")
    max_production_days = 0

    for item_input in order_data.items:
        # Busca produto garantindo tenant_id
        stmt = (
            select(Product)
            .where(Product.id == item_input.product_id, Product.tenant_id == tenant_id, Product.is_active == True)
        )
        res = await db.execute(stmt)
        product = res.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item_input.product_id} não encontrado ou inativo no catálogo."
            )

        # Carrega faixas de atacado
        tier_stmt = (
            select(ProductWholesaleTier)
            .where(ProductWholesaleTier.product_id == product.id, ProductWholesaleTier.tenant_id == tenant_id)
            .order_by(ProductWholesaleTier.min_quantity)
        )
        tier_res = await db.execute(tier_stmt)
        tiers = list(tier_res.scalars().all())

        unit_price = calculate_tier_price(Decimal(str(product.base_price)), tiers, item_input.quantity)

        # Valida e soma acréscimos de campos dinâmicos de personalização no backend
        cf_res = await db.execute(
            select(ProductCustomizationField).where(
                ProductCustomizationField.product_id == product.id,
                ProductCustomizationField.tenant_id == tenant_id,
            )
        )
        cf_map = {str(cf.id): cf for cf in cf_res.scalars().all()}
        extra_unit = Decimal("0.00")
        clean_answers = []
        first_uploaded_url = item_input.artwork_url

        for ans in (item_input.customization_answers or []):
            fid = str(ans.get("field_id") or "")
            val = ans.get("value")
            cf_obj = cf_map.get(fid)
            if val is not None and str(val).strip() != "":
                add_p = Decimal(str(cf_obj.additional_price)) if cf_obj else Decimal("0.00")
                extra_unit += add_p
                clean_answers.append({
                    "field_id": fid,
                    "label": cf_obj.label if cf_obj else (ans.get("label") or "Campo"),
                    "field_type": cf_obj.field_type if cf_obj else (ans.get("field_type") or "TEXT"),
                    "value": str(val).strip(),
                    "additional_price": float(add_p),
                })
                if (cf_obj and cf_obj.field_type == "FILE_UPLOAD") or ans.get("field_type") == "FILE_UPLOAD":
                    if not first_uploaded_url:
                        first_uploaded_url = str(val).strip()

        unit_price = unit_price + extra_unit
        subtotal = unit_price * Decimal(item_input.quantity)
        items_subtotal += subtotal

        if product.production_lead_time_days > max_production_days:
            max_production_days = product.production_lead_time_days

        order_items_to_create.append({
            "product_id": product.id,
            "sku": product.sku,
            "name": product.name,
            "product_image_url": product.image_url,
            "unit_price": unit_price,
            "quantity": item_input.quantity,
            "subtotal": subtotal,
            "custom_text": item_input.custom_text,
            "customization_notes": item_input.customization_notes,
            "customization_answers": clean_answers,
            "artwork_url": first_uploaded_url,
            "artwork_filename": item_input.artwork_filename,
            "artwork_status": "pending" if (first_uploaded_url or item_input.custom_text or clean_answers) else "approved"
        })

    # 2. Usa cliente autenticado (se logado na vitrine) ou busca/cria pelo tax_id/email dentro do tenant
    customer = authenticated_customer
    if not customer:
        customer_stmt = select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.tax_id == order_data.customer.tax_id
        )
        cust_res = await db.execute(customer_stmt)
        customer = cust_res.scalar_one_or_none()

    if not customer:
        customer = Customer(
            tenant_id=tenant_id,
            person_type=order_data.customer.person_type,
            full_name=order_data.customer.full_name,
            company_name=order_data.customer.company_name,
            tax_id=order_data.customer.tax_id,
            state_tax_id=order_data.customer.state_tax_id,
            email=order_data.customer.email.strip().lower() if order_data.customer.email else None,
            phone=order_data.customer.phone
        )
        db.add(customer)
        await db.flush()

    # 3. Calcula total
    shipping_amt = Decimal(str(order_data.shipping_amount))
    total_amount = items_subtotal + shipping_amt

    # 4. Gera código do pedido e Pix simulado
    order_number = f"PED-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    pix_code = f"00020126580014br.gov.bcb.pix0136{uuid.uuid4()}52040000530398654{total_amount:.2f}5802BR5915LOJA{tenant_id[:6]}6009SAO PAULO62070503***6304"
    pix_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={pix_code}"

    order = Order(
        tenant_id=tenant_id,
        order_number=order_number,
        customer_id=customer.id,
        status="pending_payment",
        currency="BRL",
        items_subtotal=items_subtotal,
        discount_amount=Decimal("0.00"),
        shipping_amount=shipping_amt,
        total_amount=total_amount,
        payment_method=order_data.payment_method,
        payment_status="unpaid",
        pix_copy_paste_code=pix_code if order_data.payment_method == "pix" else None,
        pix_qr_code_url=pix_qr_url if order_data.payment_method == "pix" else None,
        pix_expiration_date=datetime.utcnow() + timedelta(hours=24) if order_data.payment_method == "pix" else None,
        installments=order_data.installments,
        shipping_provider=order_data.shipping_provider,
        shipping_service_name=order_data.shipping_service_name,
        estimated_production_days=max_production_days,
        customer_snapshot=order_data.customer.model_dump(),
        shipping_address_snapshot=order_data.shipping_address.model_dump(),
        billing_address_snapshot=order_data.shipping_address.model_dump()
    )
    db.add(order)
    await db.flush()

    for item_data in order_items_to_create:
        order_item = OrderItem(
            tenant_id=tenant_id,
            order_id=order.id,
            **item_data
        )
        db.add(order_item)

    await db.commit()

    # Recarrega pedido com itens de forma assíncrona
    stmt_order = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    res_order = await db.execute(stmt_order)
    return res_order.scalar_one()
