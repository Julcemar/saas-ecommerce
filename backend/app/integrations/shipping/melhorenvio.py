import logging
import time
import httpx
from typing import List, Dict, Any, Optional
from app.integrations.shipping.base import ShippingProviderInterface
from app.config import settings

logger = logging.getLogger(__name__)

PROD_API_URL = "https://melhorenvio.com.br"
SANDBOX_API_URL = "https://sandbox.melhorenvio.com.br"


def get_base_url(sandbox: bool = False) -> str:
    return SANDBOX_API_URL if sandbox else PROD_API_URL


class MelhorEnvioShippingProvider(ShippingProviderInterface):
    """
    Provedor oficial Melhor Envio com suporte a OAuth2 e múltiplas transportadoras.
    (Correios SEDEX/PAC, Jadlog .Package/.Com, Loggi, Azul Cargo, Buslog).
    """

    @staticmethod
    def get_oauth_auth_url(tenant_id: str, sandbox: bool = False, redirect_uri: Optional[str] = None) -> str:
        """Gera URL de autorização OAuth2 para o lojista conectar sua conta do Melhor Envio."""
        base = get_base_url(sandbox)
        client_id = settings.MELHORENVIO_CLIENT_ID or "app_client_id"
        redir = redirect_uri or settings.MELHORENVIO_REDIRECT_URI
        scopes = "shipping-calculate shipping-cancel shipping-checkout shipping-companies shipping-generate shipping-preview shipping-print shipping-share shipping-tracking"
        return (
            f"{base}/oauth/authorize?client_id={client_id}"
            f"&redirect_uri={redir}&response_type=code"
            f"&scope={scopes}&state={tenant_id}"
        )

    @staticmethod
    async def exchange_code(code: str, sandbox: bool = False, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """Troca o authorization code pelo access_token e refresh_token."""
        base = get_base_url(sandbox)
        payload = {
            "grant_type": "authorization_code",
            "client_id": settings.MELHORENVIO_CLIENT_ID,
            "client_secret": settings.MELHORENVIO_CLIENT_SECRET,
            "redirect_uri": redirect_uri or settings.MELHORENVIO_REDIRECT_URI,
            "code": code
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{base}/oauth/token", data=payload)
            if resp.status_code == 200:
                data = resp.json()
                expires_in = data.get("expires_in", 2592000)  # ~30 dias
                data["expires_at"] = int(time.time()) + expires_in
                return data
            raise ValueError(f"Falha na troca de código Melhor Envio (HTTP {resp.status_code}): {resp.text}")

    @staticmethod
    async def refresh_token(refresh_token: str, sandbox: bool = False) -> Dict[str, Any]:
        """Renova o access_token utilizando o refresh_token."""
        base = get_base_url(sandbox)
        payload = {
            "grant_type": "refresh_token",
            "client_id": settings.MELHORENVIO_CLIENT_ID,
            "client_secret": settings.MELHORENVIO_CLIENT_SECRET,
            "refresh_token": refresh_token
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{base}/oauth/token", data=payload)
            if resp.status_code == 200:
                data = resp.json()
                expires_in = data.get("expires_in", 2592000)
                data["expires_at"] = int(time.time()) + expires_in
                return data
            raise ValueError(f"Falha ao renovar token Melhor Envio: {resp.text}")

    async def calculate_rates(
        self,
        origin_zip: str,
        dest_zip: str,
        items: List[Dict[str, Any]],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        sandbox = config.get("sandbox", False)
        base = get_base_url(sandbox)
        access_token = tenant_credentials.get("access_token")

        clean_origin = "".join(filter(str.isdigit, str(origin_zip)))
        clean_dest = "".join(filter(str.isdigit, str(dest_zip)))

        if not clean_origin or not clean_dest:
            logger.warning("CEP de origem ou destino ausente para cálculo Melhor Envio.")
            return []

        # Se não houver token conectado pelo lojista, retorna cotação simulada realista para não travar a vitrine
        if not access_token or not access_token.strip():
            logger.info("Melhor Envio sem access_token ativo: gerando cotação de referência.")
            return [
                {
                    "carrier": "melhorenvio",
                    "service_code": "1",
                    "service_name": "Correios SEDEX",
                    "company_name": "Correios",
                    "price": 28.50,
                    "price_cents": 2850,
                    "delivery_days": 2,
                    "error": None
                },
                {
                    "carrier": "melhorenvio",
                    "service_code": "2",
                    "service_name": "Correios PAC",
                    "company_name": "Correios",
                    "price": 18.90,
                    "price_cents": 1890,
                    "delivery_days": 5,
                    "error": None
                },
                {
                    "carrier": "melhorenvio",
                    "service_code": "3",
                    "service_name": "Jadlog .Package",
                    "company_name": "Jadlog",
                    "price": 19.80,
                    "price_cents": 1980,
                    "delivery_days": 4,
                    "error": None
                }
            ]

        # Monta produtos para cubagem
        products_payload = []
        for idx, it in enumerate(items):
            weight_kg = max(0.1, float(it.get("weight_grams", 350)) / 1000.0)
            products_payload.append({
                "id": str(it.get("id", f"item-{idx}")),
                "width": max(11, int(it.get("width_cm", 12))),
                "height": max(2, int(it.get("height_cm", 10))),
                "length": max(16, int(it.get("length_cm", 16))),
                "weight": round(weight_kg, 2),
                "insurance_value": float(it.get("unit_price", 39.90)),
                "quantity": int(it.get("quantity", 1))
            })

        calc_payload = {
            "from": {"postal_code": clean_origin},
            "to": {"postal_code": clean_dest},
            "products": products_payload
        }

        headers = {
            "Authorization": f"Bearer {access_token.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "AntigravitySaaS/1.0 (contato@seusistema.com.br)"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{base}/api/v2/me/shipment/calculate", json=calc_payload, headers=headers)
                if resp.status_code == 200:
                    results = resp.json()
                    rates = []
                    for service in results:
                        if service.get("error"):
                            continue
                        price_float = float(service.get("custom_price") or service.get("price") or 0.0)
                        if price_float <= 0:
                            continue
                        days = int(service.get("custom_delivery_time") or service.get("delivery_time") or 3)
                        company = service.get("company", {}).get("name") or "Transportadora"
                        name = service.get("name") or "Envio Expresso"

                        rates.append({
                            "carrier": "melhorenvio",
                            "service_code": str(service.get("id")),
                            "service_name": f"{company} {name}".strip(),
                            "company_name": company,
                            "price": round(price_float, 2),
                            "price_cents": int(round(price_float * 100)),
                            "delivery_days": days,
                            "error": None
                        })
                    return rates
                else:
                    logger.warning(f"Melhor Envio cálculo retornou {resp.status_code}: {resp.text}")
                    return []
        except Exception as e:
            logger.error(f"Erro ao calcular frete com Melhor Envio: {e}")
            return []
