from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.models.order import Order


class PaymentProviderInterface(ABC):
    """
    Interface abstrata base para gateways de pagamento plugáveis.
    Cada tenant pode habilitar e configurar seu próprio gateway de forma isolada.
    """

    @abstractmethod
    async def create_checkout(
        self,
        order: Order,
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any],
        redirect_url: str,
        webhook_url: str
    ) -> Dict[str, Any]:
        """
        Cria a cobrança ou sessão de checkout no gateway.
        Retorna dicionário com dados de checkout (checkout_url, qr_code, copy_paste_code, etc.).
        """
        pass

    @abstractmethod
    async def handle_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processa o webhook recebido do gateway.
        Retorna dicionário contendo:
        {
            "order_number": str,
            "status": "paid" | "failed" | "pending" | "ignored",
            "transaction_id": str,
            "raw_response": dict
        }
        """
        pass

    @abstractmethod
    async def verify_payment(
        self,
        reference_data: Dict[str, Any],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Consulta server-to-server a situação atual da transação no gateway
        para garantir confirmação infalível e proteção contra adulteração de webhooks.
        """
        pass
