from fastapi import APIRouter
from app.api.endpoints import (
    internal,
    onboarding,
    auth,
    tenant,
    categories,
    products,
    orders,
    admin_metrics,
    uploads,
    storefront,
    integrations,
    shipping,
    payment_gateways,
    webhooks,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(internal.router)
api_router.include_router(onboarding.router)
api_router.include_router(auth.router)
api_router.include_router(tenant.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(admin_metrics.router)
api_router.include_router(uploads.router)
api_router.include_router(storefront.router)
api_router.include_router(integrations.router)
api_router.include_router(shipping.router)
api_router.include_router(payment_gateways.router)
api_router.include_router(webhooks.router)
