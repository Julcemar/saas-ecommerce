from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class ShippingRateOption(BaseModel):
    carrier: str  # 'melhorenvio', 'correios', etc.
    service_code: str
    service_name: str
    company_name: str
    price: float
    price_cents: int
    delivery_days: int
    error: Optional[str] = None


class ShippingProviderInterface(ABC):
    """
    Interface abstrata padronizada para provedores de frete e cubagem logística.
    """

    @abstractmethod
    async def calculate_rates(
        self,
        origin_zip: str,
        dest_zip: str,
        items: List[Dict[str, Any]],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Calcula as tarifas e prazos para o CEP de destino somando cubagem e peso dos itens.
        Retorna lista de opções unificadas no formato:
        [
            {
                "carrier": "melhorenvio",
                "service_code": "1",
                "service_name": "Correios SEDEX",
                "company_name": "Correios",
                "price": 28.50,
                "price_cents": 2850,
                "delivery_days": 2,
                "error": None
            }
        ]
        """
        pass
