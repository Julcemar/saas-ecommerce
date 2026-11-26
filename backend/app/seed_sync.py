import json
import logging
import shutil
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from app.models.category import Category
from app.models.product import Product, ProductVariant, ProductWholesaleTier
from app.models.storefront import StorefrontBanner
from app.models.integration import TenantIntegration

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
