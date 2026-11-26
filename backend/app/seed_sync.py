import json
import logging
import shutil
import uuid
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from app.models.category import Category
from app.models.product import Product, ProductVariant, ProductWholesaleTier
from app.models.storefront import StorefrontBanner
from app.models.integration import TenantIntegration
from app.models.order import Order, OrderItem, OrderHistory

logger = logging.getLogger("saas-backend")

BASE_DIR = Path(__file__).resolve().parent.parent
SEED_DIR = BASE_DIR / "seed_data"
SEED_UPLOADS_DIR = SEED_DIR / "uploads"
SNAPSHOT_PATH = SEED_DIR / "database_snapshot.json"


def _parse_uuid(val: Any) -> Optional[uuid.UUID]:
    if val is None or val == "":
        return None
    if isinstance(val, uuid.UUID):
        return val
    return uuid.UUID(str(val))


def _parse_dt(val: Any) -> Optional[datetime]:
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo is not None else val.replace(tzinfo=timezone.utc)
    s = str(val).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def _parse_json(val: Any, default: Any) -> Any:
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return default
    return default


def _parse_bool(val: Any, default: bool = True) -> bool:
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    return str(val).strip().lower() in ("1", "true", "t", "yes", "y")


def _parse_decimal(val: Any, default: Optional[Decimal] = None) -> Optional[Decimal]:
    if val is None or val == "":
        return default
    return Decimal(str(val))


def _sync_seed_uploads() -> int:
    if not SEED_UPLOADS_DIR.exists():
        return 0

    dest_root = Path(settings.UPLOAD_DIR)
    dest_root.mkdir(parents=True, exist_ok=True)
    copied = 0

    for src in SEED_UPLOADS_DIR.rglob("*"):
        if not src.is_file() or src.name == ".gitkeep":
            continue
        rel = src.relative_to(SEED_UPLOADS_DIR)
        dst = dest_root / rel
        if not dst.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1

    return copied


async def _exists_by_id(db: AsyncSession, model: Any, record_id: uuid.UUID) -> bool:
    res = await db.execute(select(model.id).where(model.id == record_id))
    return res.scalar_one_or_none() is not None


async def _sync_tenants(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        rid = _parse_uuid(row["id"])
        slug = row["slug"]
        exists = await db.execute(
            select(Tenant.id).where((Tenant.id == rid) | (Tenant.slug == slug))
        )
        if exists.scalar_one_or_none() is not None:
            continue

        db.add(Tenant(
            id=rid,
            name=row["name"],
            slug=slug,
            custom_domain=row.get("custom_domain"),
            domain_verified=_parse_bool(row.get("domain_verified"), False),
            primary_color=row.get("primary_color") or "#0052B4",
            secondary_color=row.get("secondary_color") or "#FFD100",
            logo_url=row.get("logo_url"),
            settings_json=_parse_json(row.get("settings_json"), {}),
            is_active=_parse_bool(row.get("is_active"), True),
            created_at=_parse_dt(row.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.utcnow(),
        ))
        inserted += 1
    await db.flush()
    return inserted


async def _sync_users(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        rid = _parse_uuid(row["id"])
        email = row["email"]
        exists = await db.execute(
            select(User.id).where((User.id == rid) | (User.email == email))
        )
        if exists.scalar_one_or_none() is not None:
            continue

        db.add(User(
            id=rid,
            tenant_id=_parse_uuid(row.get("tenant_id")),
            email=email,
            password_hash=row["password_hash"],
            role=row.get("role") or "staff",
            name=row["name"],
            is_active=_parse_bool(row.get("is_active"), True),
            last_login_at=_parse_dt(row.get("last_login_at")),
            created_at=_parse_dt(row.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.utcnow(),
        ))
        inserted += 1
    await db.flush()
    return inserted


async def _sync_categories(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    # Insere primeiro categorias raiz (parent_id is None) para respeitar FK em PostgreSQL
    ordered = sorted(rows, key=lambda r: 0 if not r.get("parent_id") else 1)
    inserted = 0
    for row in ordered:
        rid = _parse_uuid(row["id"])
        if await _exists_by_id(db, Category, rid):
            continue

        db.add(Category(
            id=rid,
            tenant_id=_parse_uuid(row["tenant_id"]),
            parent_id=_parse_uuid(row.get("parent_id")),
            name=row["name"],
            slug=row["slug"],
            description=row.get("description"),
            image_url=row.get("image_url"),
            display_order=int(row.get("display_order") or 0),
            is_active=_parse_bool(row.get("is_active"), True),
            created_at=_parse_dt(row.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.utcnow(),
        ))
        inserted += 1
    await db.flush()
    return inserted


async def _sync_products(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    seen_skus = set()
    seen_slugs = set()

    # Carrega SKUs e slugs já existentes no banco para evitar violação de UNIQUE
    existing_res = await db.execute(select(Product.tenant_id, Product.sku, Product.slug))
    for tid, sku, slug in existing_res.all():
        seen_skus.add((str(tid), sku))
        seen_slugs.add((str(tid), slug))

    for row in rows:
        rid = _parse_uuid(row["id"])
        tid = _parse_uuid(row["tenant_id"])
        if await _exists_by_id(db, Product, rid):
            continue

        sku = (row.get("sku") or f"SKU-{str(rid)[:8]}").strip()
        if (str(tid), sku) in seen_skus:
            sku = f"{sku[:80]}-{str(rid)[:6]}"
        seen_skus.add((str(tid), sku))

        slug = (row.get("slug") or f"prod-{str(rid)[:8]}").strip()
        if (str(tid), slug) in seen_slugs:
            slug = f"{slug[:240]}-{str(rid)[:6]}"
        seen_slugs.add((str(tid), slug))

        base_price = _parse_decimal(row.get("base_price"), Decimal("0.00"))
        if base_price is None or base_price < Decimal("0.00"):
            base_price = Decimal("0.00")

        compare_at_price = _parse_decimal(row.get("compare_at_price"))
        if compare_at_price is not None and compare_at_price < base_price:
            compare_at_price = None

        cost_price = _parse_decimal(row.get("cost_price"))
        if cost_price is not None and cost_price < Decimal("0.00"):
            cost_price = None

        try:
            async with db.begin_nested():
                db.add(Product(
                    id=rid,
                    tenant_id=tid,
                    category_id=_parse_uuid(row.get("category_id")),
                    name=row["name"],
                    slug=slug,
                    sku=sku,
                    product_type=row.get("product_type") or "simple",
                    description=row.get("description"),
                    short_description=row.get("short_description"),
                    base_price=base_price,
                    compare_at_price=compare_at_price,
                    cost_price=cost_price,
                    image_url=row.get("image_url"),
                    weight_grams=max(1, int(row.get("weight_grams") or 300)),
                    length_cm=max(1, int(row.get("length_cm") or 16)),
                    width_cm=max(1, int(row.get("width_cm") or 12)),
                    height_cm=max(1, int(row.get("height_cm") or 10)),
                    badge_label=row.get("badge_label"),
                    is_featured=_parse_bool(row.get("is_featured"), False),
                    is_active=_parse_bool(row.get("is_active"), True),
                    enable_text_customization=_parse_bool(row.get("enable_text_customization"), False),
                    text_customization_label=row.get("text_customization_label") or "Nome ou Frase para Personalizar",
                    text_max_length=max(1, int(row.get("text_max_length") or 40)),
                    enable_artwork_upload=_parse_bool(row.get("enable_artwork_upload"), False),
                    upload_max_size_mb=max(1, int(row.get("upload_max_size_mb") or 10)),
                    allowed_upload_formats=_parse_json(
                        row.get("allowed_upload_formats"),
                        ["png", "jpg", "jpeg", "svg", "pdf"],
                    ),
                    production_lead_time_days=max(0, int(row.get("production_lead_time_days") or 0)),
                    created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
                    updated_at=_parse_dt(row.get("updated_at")) or datetime.now(timezone.utc),
                ))
                await db.flush()
            inserted += 1
        except Exception as e:
            logger.warning(f"[SeedSync] Produto ignorado ({row.get('name')} / {rid}): {e}")
    return inserted


async def _sync_variants(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        rid = _parse_uuid(row["id"])
        if await _exists_by_id(db, ProductVariant, rid):
            continue

        try:
            async with db.begin_nested():
                db.add(ProductVariant(
                    id=rid,
                    tenant_id=_parse_uuid(row["tenant_id"]),
                    product_id=_parse_uuid(row["product_id"]),
                    sku=row["sku"],
                    name=row["name"],
                    attribute_options=_parse_json(row.get("attribute_options"), {}),
                    price_modifier=_parse_decimal(row.get("price_modifier"), Decimal("0.00")),
                    final_price=_parse_decimal(row["final_price"], Decimal("0.00")),
                    stock_quantity=int(row["stock_quantity"]) if row.get("stock_quantity") is not None else None,
                    weight_grams=int(row["weight_grams"]) if row.get("weight_grams") is not None else None,
                    is_active=_parse_bool(row.get("is_active"), True),
                    created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
                    updated_at=_parse_dt(row.get("updated_at")) or datetime.now(timezone.utc),
                ))
                await db.flush()
            inserted += 1
        except Exception as e:
            logger.warning(f"[SeedSync] Variante ignorada ({rid}): {e}")
    return inserted


async def _sync_wholesale_tiers(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        rid = _parse_uuid(row["id"])
        if await _exists_by_id(db, ProductWholesaleTier, rid):
            continue

        try:
            async with db.begin_nested():
                db.add(ProductWholesaleTier(
                    id=rid,
                    tenant_id=_parse_uuid(row["tenant_id"]),
                    product_id=_parse_uuid(row["product_id"]),
                    min_quantity=max(1, int(row["min_quantity"])),
                    unit_price=_parse_decimal(row["unit_price"], Decimal("0.01")),
                    created_at=_parse_dt(row.get("created_at")) or datetime.now(timezone.utc),
                    updated_at=_parse_dt(row.get("updated_at")) or datetime.now(timezone.utc),
                ))
                await db.flush()
            inserted += 1
        except Exception as e:
            logger.warning(f"[SeedSync] Faixa de atacado ignorada ({rid}): {e}")
    return inserted


async def _sync_banners(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        rid = _parse_uuid(row["id"])
        if await _exists_by_id(db, StorefrontBanner, rid):
            continue

        db.add(StorefrontBanner(
            id=rid,
            tenant_id=_parse_uuid(row["tenant_id"]),
            badge_1=row.get("badge_1"),
            badge_2=row.get("badge_2"),
            title_prefix=row.get("title_prefix"),
            title_highlight=row["title_highlight"],
            title_suffix=row.get("title_suffix"),
            description=row.get("description"),
            btn_1_text=row.get("btn_1_text"),
            btn_1_url=row.get("btn_1_url"),
            btn_2_text=row.get("btn_2_text"),
            btn_2_url=row.get("btn_2_url"),
            highlight_1=row.get("highlight_1"),
            highlight_2=row.get("highlight_2"),
            highlight_3=row.get("highlight_3"),
            banner_image_url=row["banner_image_url"],
            config_json=_parse_json(row.get("config_json"), {}),
            is_active=_parse_bool(row.get("is_active"), True),
            created_at=_parse_dt(row.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.utcnow(),
        ))
        inserted += 1
    await db.flush()
    return inserted


async def _sync_integrations(db: AsyncSession, rows: List[Dict[str, Any]]) -> int:
    inserted = 0
    for row in rows:
        rid = _parse_uuid(row["id"])
        if await _exists_by_id(db, TenantIntegration, rid):
            continue

        db.add(TenantIntegration(
            id=rid,
            tenant_id=_parse_uuid(row["tenant_id"]),
            provider=row["provider"],
            category=row["category"],
            is_active=_parse_bool(row.get("is_active"), False),
            credentials_encrypted=row.get("credentials_encrypted"),
            config_json=_parse_json(row.get("config_json"), {}),
            created_at=_parse_dt(row.get("created_at")) or datetime.utcnow(),
            updated_at=_parse_dt(row.get("updated_at")) or datetime.utcnow(),
        ))
        inserted += 1
    await db.flush()
    return inserted


async def sync_seed_data() -> None:
    """
    Sincroniza imagens e snapshot do banco (backend/seed_data/) de forma idempotente
    na inicialização da aplicação.
    """
    copied_images = _sync_seed_uploads()
    if copied_images:
        logger.info(f"[SeedSync] {copied_images} imagem(ns) sincronizada(s) para {settings.UPLOAD_DIR}.")

    if not SNAPSHOT_PATH.exists():
        return

    try:
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            snapshot = json.load(f)
    except Exception as e:
        logger.error(f"[SeedSync] Erro ao ler {SNAPSHOT_PATH}: {e}")
        return

    async with AsyncSessionLocal() as db:
        steps = [
            ("tenants", _sync_tenants),
            ("users", _sync_users),
            ("categories", _sync_categories),
            ("products", _sync_products),
            ("product_variants", _sync_variants),
            ("product_wholesale_tiers", _sync_wholesale_tiers),
            ("storefront_banners", _sync_banners),
            ("tenant_integrations", _sync_integrations),
        ]
        counts = {}
        for table_name, sync_fn in steps:
            try:
                counts[table_name] = await sync_fn(db, snapshot.get(table_name, []))
                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.exception(f"[SeedSync] Falha ao sincronizar tabela '{table_name}': {e}")
                counts[table_name] = 0

        total_inserted = sum(counts.values())
        if total_inserted > 0:
            logger.info(f"[SeedSync] Sincronização concluída: {counts}")
        else:
            logger.info("[SeedSync] Banco já sincronizado (nenhum registro novo pendente).")

        await _seed_jestein_sample_orders(db)


async def _seed_jestein_sample_orders(db: AsyncSession) -> None:
    """Popula 6 pedidos de exemplo realistas para Jestein Personalizados caso ainda não haja pedidos."""
    try:
        j_res = await db.execute(select(Tenant).where(Tenant.slug == "jestein"))
        jestein = j_res.scalar_one_or_none()
        if not jestein:
            return

        cnt_res = await db.execute(
            select(func.count(Order.id)).where(Order.tenant_id == jestein.id)
        )
        if (cnt_res.scalar() or 0) > 0:
            return

        today = date.today()
        samples = [
            {
                "order_number": "#1041",
                "production_status": "NEW",
                "payment_status": "PAID",
                "priority": "URGENT",
                "due_date": today - timedelta(days=1),  # Atrasado
                "customer": {"full_name": "Mariana Costa (TechBR)", "phone": "(41) 99811-2233", "email": "mariana@techbr.com.br", "tax_id": "12.345.678/0001-90"},
                "address": {"street": "Av. Batel", "number": "1450", "neighborhood": "Batel", "city": "Curitiba", "state": "PR", "postal_code": "80420-090"},
                "items": [
                    {"name": "Caneca de Cerâmica Branca Personalizada 325ml", "sku": "CAN-CER-325", "qty": 24, "price": Decimal("32.90"), "custom_text": "TechBR Summit 2026", "notes": "Logo centralizado em frente e verso", "art_approved": False, "img": "/themes/neo_brutalist/caneca-prod-large.png"},
                ],
            },
            {
                "order_number": "#1042",
                "production_status": "ART_APPROVAL",
                "payment_status": "PAID",
                "priority": "NORMAL",
                "due_date": today,  # Vence hoje
                "customer": {"full_name": "Lucas Andrade", "phone": "(11) 99455-8877", "email": "lucas.andrade@gmail.com", "tax_id": "345.678.901-22"},
                "address": {"street": "Rua Augusta", "number": "910", "neighborhood": "Consolação", "city": "São Paulo", "state": "SP", "postal_code": "01304-001"},
                "items": [
                    {"name": "Garrafa com Mosquetão", "sku": "JES-GARRAFA-CO", "qty": 15, "price": Decimal("38.00"), "custom_text": "Equipe Alpha CrossFit", "notes": "Gravação a laser lateral", "art_approved": False, "img": "/uploads/jestein/garrafa-com-mosquetao.jpg"},
                ],
            },
            {
                "order_number": "#1043",
                "production_status": "IN_PRODUCTION",
                "payment_status": "PAID",
                "priority": "URGENT",
                "due_date": today + timedelta(days=1),
                "customer": {"full_name": "Clínica Sorriso Pleno", "phone": "(41) 99123-4567", "email": "compras@sorrisopleno.com.br", "tax_id": "23.456.789/0001-10"},
                "address": {"street": "Rua XV de Novembro", "number": "320", "neighborhood": "Centro", "city": "Curitiba", "state": "PR", "postal_code": "80020-310"},
                "items": [
                    {"name": "Caneca Térmica Inox Escovado Personalizada 500ml", "sku": "CAN-TER-500", "qty": 10, "price": Decimal("42.90"), "custom_text": "Dra. Camila & Equipe", "notes": "Fonte serifada elegante", "art_approved": True, "img": "/themes/neo_brutalist/caneca-prod-large.png"},
                ],
            },
            {
                "order_number": "#1044",
                "production_status": "IN_PRODUCTION",
                "payment_status": "PENDING",
                "priority": "NORMAL",
                "due_date": today + timedelta(days=3),
                "customer": {"full_name": "Fernanda Lima", "phone": "(47) 99600-1122", "email": "fernanda.lima@uol.com.br", "tax_id": "556.778.899-00"},
                "address": {"street": "Av. Brasil", "number": "2200", "neighborhood": "Centro", "city": "Balneário Camboriú", "state": "SC", "postal_code": "88330-040"},
                "items": [
                    {"name": "Kit Torre 2 xícaras com Suporte Metálico", "sku": "JES-KIT-TORRE-", "qty": 2, "price": Decimal("79.90"), "custom_text": "Casamento F & R - 12/12", "notes": "Embalar individualmente com laço", "art_approved": True, "img": "/uploads/jestein/kit-torre-2-xicaras-com-suporte-metalico.jpg"},
                ],
            },
            {
                "order_number": "#1045",
                "production_status": "QUALITY_PACKING",
                "payment_status": "PAID",
                "priority": "NORMAL",
                "due_date": today + timedelta(days=2),
                "customer": {"full_name": "Rafael Mendes", "phone": "(21) 98877-6655", "email": "rafael@mendesarch.com", "tax_id": "998.877.665-11"},
                "address": {"street": "Rua Visconde de Pirajá", "number": "414", "neighborhood": "Ipanema", "city": "Rio de Janeiro", "state": "RJ", "postal_code": "22410-002"},
                "items": [
                    {"name": "Garrafa Plástica 500ml", "sku": "JES-GARRAFA-PL", "qty": 50, "price": Decimal("8.00"), "custom_text": "Evento Arquitetura Rio", "notes": "Silk 1 cor branco", "art_approved": True, "img": "/uploads/jestein/garrafa-com-mosquetao.jpg"},
                ],
            },
            {
                "order_number": "#1046",
                "production_status": "READY_TO_SHIP",
                "payment_status": "PAID",
                "priority": "NORMAL",
                "due_date": today + timedelta(days=1),
                "customer": {"full_name": "Escola Futuro Brilhante", "phone": "(41) 99988-7766", "email": "direcao@futurobrilhante.edu.br", "tax_id": "45.678.912/0001-55"},
                "address": {"street": "Av. Sete de Setembro", "number": "4100", "neighborhood": "Água Verde", "city": "Curitiba", "state": "PR", "postal_code": "80250-210"},
                "items": [
                    {"name": "Caneca de Cerâmica Branca Personalizada 325ml", "sku": "CAN-CER-325", "qty": 30, "price": Decimal("29.90"), "custom_text": "Formatura 9º Ano 2026", "notes": "Caixinhas individuais inclusas", "art_approved": True, "img": "/themes/neo_brutalist/caneca-prod-large.png"},
                ],
            },
        ]

        for s in samples:
            subtotal = sum(it["price"] * it["qty"] for it in s["items"])
            shipping = Decimal("24.90")
            order = Order(
                tenant_id=jestein.id,
                order_number=s["order_number"],
                status="in_production" if s["production_status"] != "NEW" else "payment_confirmed",
                production_status=s["production_status"],
                due_date=s["due_date"],
                priority=s["priority"],
                items_subtotal=subtotal,
                discount_amount=Decimal("0.00"),
                shipping_amount=shipping,
                total_amount=subtotal + shipping,
                payment_method="pix",
                payment_status=s["payment_status"],
                shipping_provider="melhorenvio",
                shipping_service_name="SEDEX",
                estimated_production_days=3,
                estimated_delivery_date=s["due_date"],
                customer_snapshot=s["customer"],
                shipping_address_snapshot=s["address"],
                billing_address_snapshot=s["address"],
            )
            db.add(order)
            await db.flush()

            for it in s["items"]:
                db.add(OrderItem(
                    tenant_id=jestein.id,
                    order_id=order.id,
                    sku=it["sku"],
                    name=it["name"],
                    product_image_url=it["img"],
                    unit_price=it["price"],
                    quantity=it["qty"],
                    subtotal=it["price"] * it["qty"],
                    custom_text=it["custom_text"],
                    customization_notes=it["notes"],
                    art_approved=it["art_approved"],
                    artwork_status="approved" if it["art_approved"] else "pending",
                ))

            db.add(OrderHistory(
                tenant_id=jestein.id,
                order_id=order.id,
                actor_name="Sistema",
                event_type="CREATED",
                to_status=s["production_status"],
                message=f"Pedido {s['order_number']} importado para a fila de produção.",
            ))

        await db.commit()
        logger.info("[SeedSync] 6 pedidos de exemplo criados para Jestein Personalizados.")
    except Exception as e:
        await db.rollback()
        logger.warning(f"[SeedSync] Aviso ao criar pedidos de exemplo: {e}")
