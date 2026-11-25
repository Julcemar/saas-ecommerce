import logging
import httpx
from typing import Dict, Any, Optional
from decimal import Decimal
from app.integrations.payment.base import PaymentProviderInterface
from app.models.order import Order

logger = logging.getLogger(__name__)

INFINITE_LINKS_URL = "https://api.checkout.infinitepay.io/links"
INFINITE_CHECK_URL = "https://api.checkout.infinitepay.io/payment_check"


class InfinitePayPaymentProvider(PaymentProviderInterface):
    """
    Provedor oficial do Checkout Integrado da InfinitePay.
    Suporta Pix instantâneo, Cartão de Crédito e Parcelamento Garantido (assured_installments).
    """

    async def create_checkout(
        self,
        order: Order,
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any],
        redirect_url: str,
        webhook_url: str
    ) -> Dict[str, Any]:
        handle = (tenant_credentials.get("handle") or "").strip().lstrip("$")
        if not handle:
            raise ValueError("InfiniteTag ('handle') não configurada para este lojista.")

        api_key = tenant_credentials.get("api_key")
        max_installments = int(config.get("assured_installments", 12))

        # 1. Monta itens em centavos
        items_payload = []
        for item in order.items:
            unit_price_cents = int(Decimal(str(item.unit_price)) * 100)
            desc = item.name
            if item.custom_text:
                desc += f" (Gravação: {item.custom_text})"
            items_payload.append({
                "description": desc[:255],
                "quantity": item.quantity,
                "price": unit_price_cents
            })

        # 2. Adiciona o frete como item adicional se > 0
        shipping_cents = int(Decimal(str(order.shipping_amount)) * 100)
        if shipping_cents > 0:
            shipping_name = order.shipping_service_name or "Frete Nacional"
            items_payload.append({
                "description": f"Logística de Envio: {shipping_name}",
                "quantity": 1,
                "price": shipping_cents
            })

        customer_snap = order.customer_snapshot or {}
        customer_phone = "".join(filter(str.isdigit, str(customer_snap.get("phone", ""))))
        if not customer_phone.startswith("55") and len(customer_phone) in (10, 11):
            customer_phone = f"55{customer_phone}"

        payload = {
            "handle": handle,
            "order_nsu": order.order_number,
            "redirect_url": redirect_url,
            "webhook_url": webhook_url,
            "items": items_payload,
            "customer": {
                "name": customer_snap.get("full_name") or "Cliente",
                "email": customer_snap.get("email") or "cliente@exemplo.com",
                "phone": customer_phone or "5511999999999"
            }
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if api_key and api_key.strip():
            headers["Authorization"] = f"Bearer {api_key.strip()}"
            headers["x-api-key"] = api_key.strip()

        logger.info(f"Criando link InfinitePay para pedido {order.order_number} (Handle: {handle})")

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(INFINITE_LINKS_URL, json=payload, headers=headers)
                
                if resp.status_code in (200, 201):
                    res_json = resp.json()
                    checkout_url = res_json.get("url") or res_json.get("link") or res_json.get("checkout_url")
                    return {
                        "provider": "infinitepay",
                        "checkout_url": checkout_url,
                        "transaction_id": res_json.get("id") or order.order_number,
                        "raw_response": res_json
                    }
                else:
                    logger.warning(
                        f"InfinitePay links retornou status {resp.status_code}: {resp.text}"
                    )
                    # Fallback com link direto para o handle do lojista caso a API de links esteja em modo demonstrativo
                    fallback_url = f"https://checkout.infinitepay.io/{handle}?order_nsu={order.order_number}&amount={int(order.total_amount * 100)}"
                    return {
                        "provider": "infinitepay",
                        "checkout_url": fallback_url,
                        "transaction_id": order.order_number,
                        "notice": f"Link direto gerado para @{handle}",
                        "raw_response": {"status_code": resp.status_code, "body": resp.text}
                    }
        except Exception as e:
            logger.error(f"Erro de comunicação com API InfinitePay: {e}")
            fallback_url = f"https://checkout.infinitepay.io/{handle}?order_nsu={order.order_number}&amount={int(order.total_amount * 100)}"
            return {
                "provider": "infinitepay",
                "checkout_url": fallback_url,
                "transaction_id": order.order_number,
                "error": str(e)
            }

    async def verify_payment(
        self,
        reference_data: Dict[str, Any],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        TRAVA DE SEGURANÇA SERVER-TO-SERVER OBRIGATÓRIA:
        Consulta POST https://api.checkout.infinitepay.io/payment_check
        com { "handle", "order_nsu", "transaction_nsu" }.
        Só aprova se o gateway retornar "paid": true.
        """
        handle = (tenant_credentials.get("handle") or "").strip().lstrip("$")
        order_nsu = reference_data.get("order_nsu")
        transaction_nsu = reference_data.get("transaction_nsu") or reference_data.get("transaction_id") or ""

        if not handle or not order_nsu:
            return {"paid": False, "reason": "Missing handle or order_nsu"}

        check_payload = {
            "handle": handle,
            "order_nsu": order_nsu,
            "transaction_nsu": transaction_nsu
        }

        api_key = tenant_credentials.get("api_key")
        headers = {"Content-Type": "application/json"}
        if api_key and api_key.strip():
            headers["Authorization"] = f"Bearer {api_key.strip()}"

        logger.info(f"Validando pagamento server-to-server InfinitePay: {check_payload}")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(INFINITE_CHECK_URL, json=check_payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    is_paid = data.get("paid") is True
                    return {
                        "paid": is_paid,
                        "status": "paid" if is_paid else "pending",
                        "transaction_id": transaction_nsu,
                        "payment_method": data.get("payment_method", "pix"),
                        "raw_response": data
                    }
                else:
                    logger.warning(f"Payment check InfinitePay falhou com status {resp.status_code}: {resp.text}")
                    return {
                        "paid": False,
                        "status": "failed",
                        "reason": f"HTTP {resp.status_code}: {resp.text}"
                    }
        except Exception as e:
            logger.error(f"Erro na requisição payment_check InfinitePay: {e}")
            return {
                "paid": False,
                "status": "error",
                "reason": str(e)
            }

    async def handle_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processa notificação de webhook da InfinitePay com validação server-to-server.
        """
        order_nsu = (
            payload.get("order_nsu") or
            payload.get("data", {}).get("order_nsu") or
            payload.get("order_number")
        )
        transaction_nsu = (
            payload.get("transaction_nsu") or
            payload.get("data", {}).get("transaction_nsu") or
            payload.get("transaction_id") or ""
        )

        if not order_nsu:
            logger.warning("Webhook InfinitePay recebido sem order_nsu.")
            return {"status": "ignored", "reason": "No order_nsu provided"}

        # Executa obrigatoriamente a verificação server-to-server
        verification = await self.verify_payment(
            {"order_nsu": order_nsu, "transaction_nsu": transaction_nsu},
            tenant_credentials,
            config
        )

        if verification.get("paid") is True:
            return {
                "order_number": order_nsu,
                "status": "paid",
                "transaction_id": transaction_nsu,
                "payment_method": verification.get("payment_method", "infinitepay"),
                "raw_response": verification
            }
        else:
            return {
                "order_number": order_nsu,
                "status": "pending_or_failed",
                "transaction_id": transaction_nsu,
                "raw_response": verification
            }
