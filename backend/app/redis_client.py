import json
import logging
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

redis_pool: Optional[aioredis.Redis] = None
_redis_available: bool = True
_in_memory_cache: Dict[str, Any] = {}


async def get_redis() -> Optional[aioredis.Redis]:
    global redis_pool, _redis_available
    if not _redis_available:
        return None
    if redis_pool is None:
        try:
            redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.2,
            )
        except Exception:
            _redis_available = False
            return None
    return redis_pool


async def close_redis():
    global redis_pool
    if redis_pool is not None:
        try:
            await redis_pool.close()
        except Exception:
            pass
        redis_pool = None


async def get_cached_tenant(key: str) -> Optional[Dict[str, Any]]:
    """Busca dados de tenant no cache Redis ou fallback em memória instantâneo."""
    global _redis_available
    # Checa cache em memória primeiro
    if key in _in_memory_cache:
        return _in_memory_cache[key]

    if not _redis_available:
        return None

    try:
        r = await get_redis()
        if r is None:
            return None
        data = await r.get(f"tenant:{key}")
        if data:
            val = json.loads(data)
            _in_memory_cache[key] = val
            return val
    except Exception as e:
        _redis_available = False
        logger.info(f"Redis offline ou indisponível ({e}). Operando com cache em memória.")
    return None


async def set_cached_tenant(key: str, tenant_data: Dict[str, Any], ttl: int = settings.REDIS_TENANT_CACHE_TTL):
    """Grava dados do tenant no cache com TTL."""
    global _redis_available
    _in_memory_cache[key] = tenant_data
    if not _redis_available:
        return

    try:
        r = await get_redis()
        if r is not None:
            await r.setex(f"tenant:{key}", ttl, json.dumps(tenant_data))
    except Exception:
        _redis_available = False


async def invalidate_tenant_cache(slug: str, custom_domain: Optional[str] = None):
    """Invalida cache do tenant por slug e domínio customizado."""
    global _redis_available
    _in_memory_cache.pop(f"slug:{slug}", None)
    if custom_domain:
        _in_memory_cache.pop(f"domain:{custom_domain}", None)

    if not _redis_available:
        return

    try:
        r = await get_redis()
        if r is not None:
            keys = [f"tenant:slug:{slug}"]
            if custom_domain:
                keys.append(f"tenant:domain:{custom_domain}")
            await r.delete(*keys)
    except Exception:
        _redis_available = False
