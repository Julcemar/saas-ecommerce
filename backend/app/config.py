import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    PROJECT_NAME: str = "SaaS E-commerce Multi-Tenant"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    # Domínio principal da plataforma (para roteamento de tenant)
    MAIN_DOMAINS: Union[List[str], str] = [
        "seusistema.com.br",
        "app.seusistema.com.br",
        "localhost",
        "127.0.0.1",
    ]

    @field_validator("MAIN_DOMAINS")
    @classmethod
    def assemble_main_domains(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [x.strip() for x in v.split(",") if x.strip()]
        return list(v)

    # Database URLs
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@postgres:5432/ecommerce_saas"
    )
    SYNC_DATABASE_URL: str = os.getenv(
        "SYNC_DATABASE_URL",
        "postgresql://postgres:postgres@postgres:5432/ecommerce_saas"
    )

    # Redis URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    REDIS_TENANT_CACHE_TTL: int = 300  # 5 minutos

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-saas-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias

    # Criptografia simétrica de credenciais dos lojistas (Fernet Key)
    ENCRYPTION_KEY: str = os.getenv(
        "ENCRYPTION_KEY",
        "GTp1Y_2StR1idjKIEEShehpZXWbAKS3xlXSnom8lAoY="
    )

    # Integrações Globais (OAuth2 / Webhooks)
    PLATFORM_BASE_URL: str = os.getenv("PLATFORM_BASE_URL", "http://localhost:8000")
    MELHORENVIO_CLIENT_ID: str = os.getenv("MELHORENVIO_CLIENT_ID", "")
    MELHORENVIO_CLIENT_SECRET: str = os.getenv("MELHORENVIO_CLIENT_SECRET", "")
    MELHORENVIO_REDIRECT_URI: str = os.getenv(
        "MELHORENVIO_REDIRECT_URI",
        "http://localhost:8000/api/integrations/melhorenvio/callback"
    )

    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_UPLOAD_SIZE_MB: int = 50

    # CNAME alvo para validação de domínio próprio
    CNAME_TARGET: str = os.getenv("CNAME_TARGET", "cname.seusistema.com.br")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
