import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base, init_db_resilient
from app.seed_sync import sync_seed_data
from app.redis_client import get_redis, close_redis
from app.middleware.tenant import TenantResolutionMiddleware
from app.api.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("saas-backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando SaaS Multi-Tenant Backend...")
    # Cria diretório de uploads se não existir
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Conecta Redis
    try:
        r = await get_redis()
        await r.ping()
        logger.info("Conectado com sucesso ao Redis.")
    except Exception as e:
        logger.warning(f"Aviso: Não foi possível conectar ao Redis na inicialização ({e}). Operando sem cache.")

    # Cria tabelas com resiliência automática (Postgres ou SQLite local)
    await init_db_resilient()

    # Sincroniza snapshot e imagens de seed_data/ se existirem (idempotente)
    await sync_seed_data()

    yield

    logger.info("Encerrando conexões...")
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS liberado para frontend local e subdomínios
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra Middleware de Resolução de Tenant
app.add_middleware(TenantResolutionMiddleware)

# Monta arquivos estáticos de uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads/static", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Inclui rotas da API
app.include_router(api_router)


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/", tags=["Root"])
async def root_status(request: Request):
    tenant = getattr(request.state, "tenant", None)
    is_platform_root = getattr(request.state, "is_platform_root", False)
    return {
        "message": "SaaS Multi-Tenant API Core",
        "is_platform_root": is_platform_root,
        "tenant": tenant["slug"] if tenant else None
    }
