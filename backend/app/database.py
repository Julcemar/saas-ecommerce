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


async def init_db_resilient():
    """Inicializa as tabelas do banco de dados, com fallback automático para SQLite apenas fora da produção."""
    global engine, AsyncSessionLocal
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if conn.dialect.name == "postgresql":
                await conn.execute(
                    text(
                        "ALTER TABLE storefront_banners "
                        "ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;"
                    )
                )
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
        logger.info("Banco de dados SQLite (saas_local.db) inicializado com sucesso!")


async def get_db():
    """Dependency para obter sessão do banco de dados assíncrono."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
