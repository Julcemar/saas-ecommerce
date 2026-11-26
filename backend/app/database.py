import os
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

logger = logging.getLogger(__name__)


def _normalize_async_db_url(raw_url: str) -> str:
    """Normaliza URLs postgres:// ou postgresql:// para postgresql+asyncpg://."""
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    # Apenas redireciona @postgres: para @127.0.0.1: em desenvolvimento local fora do Docker
    is_docker = os.path.exists("/.dockerenv")
    if "@postgres:" in url and settings.ENVIRONMENT != "production" and not is_docker:
        url = url.replace("@postgres:", "@127.0.0.1:")

    return url


db_url = _normalize_async_db_url(settings.DATABASE_URL)

# Criação do engine assíncrono com suporte tanto a PostgreSQL quanto a SQLite
connect_args = {}
engine_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}

if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_async_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def _ensure_sqlite_columns(conn) -> None:
    """Garante novas colunas no SQLite local sem perder dados existentes."""
    sqlite_migrations = {
        "categories": [
            ("seo_title", "VARCHAR(70)"),
            ("seo_description", "VARCHAR(160)"),
        ],
        "tenants": [
            ("home_config", "JSON DEFAULT '{}'"),
        ],
        "products": [
            ("images_json", "JSON NOT NULL DEFAULT '[]'"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'"),
            ("track_inventory", "BOOLEAN NOT NULL DEFAULT 0"),
            ("stock_quantity", "INTEGER NOT NULL DEFAULT 0"),
            ("low_stock_threshold", "INTEGER NOT NULL DEFAULT 5"),
            ("allow_backorder", "BOOLEAN NOT NULL DEFAULT 0"),
            ("is_physical", "BOOLEAN NOT NULL DEFAULT 1"),
            ("seo_title", "VARCHAR(70)"),
            ("seo_description", "VARCHAR(160)"),
        ],
        "product_variants": [
            ("image_url", "TEXT"),
        ],
        "orders": [
            ("production_status", "VARCHAR(50) NOT NULL DEFAULT 'NEW'"),
            ("due_date", "DATE"),
            ("priority", "VARCHAR(20) NOT NULL DEFAULT 'NORMAL'"),
            ("internal_notes", "TEXT"),
        ],
        "order_items": [
            ("variant_name", "VARCHAR(255)"),
            ("product_image_url", "TEXT"),
            ("customization_notes", "TEXT"),
            ("customization_answers", "JSON NOT NULL DEFAULT '[]'"),
            ("approved_art_url", "TEXT"),
            ("art_approved", "BOOLEAN NOT NULL DEFAULT 0"),
        ],
        "customers": [
            ("birth_date", "DATE"),
            ("notes", "TEXT"),
            ("tags", "JSON NOT NULL DEFAULT '[]'"),
        ],
        "customer_addresses": [
            ("label", "VARCHAR(100) DEFAULT 'Principal'"),
        ],
    }
    for table, cols in sqlite_migrations.items():
        res = await conn.execute(text(f"PRAGMA table_info({table})"))
        existing = {row[1] for row in res.fetchall()}
        for col_name, col_def in cols:
            if col_name not in existing:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"))


async def init_db_resilient():
    """Inicializa as tabelas do banco de dados, com fallback automático para SQLite apenas fora da produção."""
    global engine, AsyncSessionLocal
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if conn.dialect.name == "postgresql":
                migrations = [
                    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS home_config JSONB DEFAULT '{}'::jsonb;",
                    "ALTER TABLE storefront_banners ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;",
                    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_title VARCHAR(70);",
                    "ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_description VARCHAR(160);",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS images_json JSONB NOT NULL DEFAULT '[]'::jsonb;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT false;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 5;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN NOT NULL DEFAULT false;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_physical BOOLEAN NOT NULL DEFAULT true;",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title VARCHAR(70);",
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description VARCHAR(160);",
                    "ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url TEXT;",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_status VARCHAR(50) NOT NULL DEFAULT 'NEW';",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS due_date DATE;",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;",
                    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255);",
                    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image_url TEXT;",
                    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customization_notes TEXT;",
                    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customization_answers JSONB NOT NULL DEFAULT '[]'::jsonb;",
                    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS approved_art_url TEXT;",
                    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS art_approved BOOLEAN NOT NULL DEFAULT false;",
                    "ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_payment_status;",
                    "ALTER TABLE orders ALTER COLUMN payment_status DROP DEFAULT;",
                    "ALTER TABLE orders ALTER COLUMN payment_status TYPE VARCHAR(50) USING payment_status::text;",
                    "ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'PENDING';",
                    "ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;",
                    "ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(50) USING status::text;",
                    "ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_payment';",
                    "ALTER TABLE orders ALTER COLUMN payment_method DROP DEFAULT;",
                    "ALTER TABLE orders ALTER COLUMN payment_method TYPE VARCHAR(50) USING payment_method::text;",
                    "ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'pix';",
                    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;",
                    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;",
                    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;",
                    "ALTER TABLE customers ALTER COLUMN person_type DROP DEFAULT;",
                    "ALTER TABLE customers ALTER COLUMN person_type TYPE VARCHAR(20) USING person_type::text;",
                    "ALTER TABLE customers ALTER COLUMN person_type SET DEFAULT 'PF';",
                    "ALTER TABLE customers ALTER COLUMN tax_id DROP NOT NULL;",
                    "ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;",
                    "ALTER TABLE customers DROP CONSTRAINT IF EXISTS uq_customers_tenant_email;",
                    "ALTER TABLE customers DROP CONSTRAINT IF EXISTS uq_customers_tenant_tax_id;",
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tenant_email_nonempty ON customers (tenant_id, email) WHERE email IS NOT NULL AND email <> '';",
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tenant_tax_id_nonempty ON customers (tenant_id, tax_id) WHERE tax_id IS NOT NULL AND tax_id <> '';",
                    "ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS label VARCHAR(100) DEFAULT 'Principal';",
                    "ALTER TABLE customer_addresses ALTER COLUMN address_type DROP DEFAULT;",
                    "ALTER TABLE customer_addresses ALTER COLUMN address_type TYPE VARCHAR(20) USING address_type::text;",
                    "ALTER TABLE customer_addresses ALTER COLUMN address_type SET DEFAULT 'shipping';",
                    "ALTER TABLE products DROP CONSTRAINT IF EXISTS products_compare_at_price_check;",
                    "ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_tenant_role;",
                    "ALTER TABLE users ALTER COLUMN role DROP DEFAULT;",
                    "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;",
                    "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';",
                    "ALTER TABLE users ADD CONSTRAINT chk_user_tenant_role CHECK ((role = 'super_admin' AND tenant_id IS NULL) OR (role IN ('tenant_owner', 'staff') AND tenant_id IS NOT NULL));",
                    "ALTER TABLE products ALTER COLUMN product_type DROP DEFAULT;",
                    "ALTER TABLE products ALTER COLUMN product_type TYPE VARCHAR(20) USING product_type::text;",
                    "ALTER TABLE products ALTER COLUMN product_type SET DEFAULT 'simple';",
                ]
                for sql in migrations:
                    await conn.execute(text(sql))
            else:
                await _ensure_sqlite_columns(conn)
        logger.info(f"Banco de dados inicializado com sucesso ({engine.url.drivername}).")
    except Exception as e:
        logger.warning(f"Não foi possível conectar ao PostgreSQL ({e}).")
        if settings.ENVIRONMENT == "production" and os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() != "true":
            logger.error("Ambiente de produção requer PostgreSQL ativo. Abortando fallback para SQLite.")
            raise

        logger.info("Ativando SQLite assíncrono local (saas_local.db) para desenvolvimento...")
        from pathlib import Path
        db_file = Path(__file__).resolve().parent.parent / "saas_local.db"
        sqlite_url = f"sqlite+aiosqlite:///{db_file.as_posix()}"
        engine = create_async_engine(sqlite_url, connect_args={"check_same_thread": False})
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await _ensure_sqlite_columns(conn)
        logger.info("Banco de dados SQLite (saas_local.db) inicializado com sucesso!")


async def get_db():
    """Dependency para obter sessão do banco de dados assíncrono."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
