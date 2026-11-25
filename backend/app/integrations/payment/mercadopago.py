import logging
import httpx
from typing import Dict, Any, Optional
from decimal import Decimal
from app.integrations.payment.base import PaymentProviderInterface
from app.models.order import Order

logger = logging.getLogger(__name__)

MP_API_BASE = "https://api.mercadopago.com"


class MercadoPagoPaymentProvider(PaymentProviderInterface):
    """
    Provedor oficial Mercado Pago (Checkout Pro e Pix Direto).
    """

    async def create_checkout(
        self,
        order: Order,
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any],
        redirect_url: str,
        webhook_url: str
    ) -> Dict[str, Any]:
        access_token = tenant_credentials.get("access_token")
        if not access_token or not access_token.strip():
            raise ValueError("Mercado Pago 'access_token' não configurado.")

        customer_snap = order.customer_snapshot or {}
        is_pix_direct = order.payment_method == "pix"

        headers = {
            "Authorization": f"Bearer {access_token.strip()}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": f"mp-{order.id}"
        }

        # Se o cliente optou por Pix no checkout, podemos gerar o Pix direto transparente
        if is_pix_direct:
            pix_payload = {
                "transaction_amount": float(order.total_amount),
                "description": f"Pedido {order.order_number}",
                "payment_method_id": "pix",
                "payer": {
                    "email": customer_snap.get("email") or "cliente@exemplo.com",
                    "first_name": customer_snap.get("full_name", "").split(" ")[0] or "Cliente",
                    "identification": {
                        "type": "CPF" if len(customer_snap.get("tax_id", "").replace(".", "").replace("-", "")) <= 11 else "CNPJ",
                        "number": "".join(filter(str.isdigit, str(customer_snap.get("tax_id", ""))))
                    }
                },
                "external_reference": order.order_number,
                "notification_url": webhook_url
            }

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(f"{MP_API_BASE}/v1/payments", json=pix_payload, headers=headers)
                    if resp.status_code in (200, 201):
                        data = resp.json()
                        tx_data = data.get("point_of_interaction", {}).get("transaction_data", {})
                        return {
                            "provider": "mercadopago",
                            "transaction_id": str(data.get("id")),
                            "pix_copy_paste_code": tx_data.get("qr_code"),
                            "pix_qr_code_base64": tx_data.get("qr_code_base64"),
                            "ticket_url": tx_data.get("ticket_url"),
                            "status": data.get("status"),
                            "raw_response": data
                        }
                    else:
                        logger.warning(f"Mercado Pago Pix falhou ({resp.status_code}): {resp.text}")
            except Exception as e:
                logger.error(f"Erro Mercado Pago Pix: {e}")

        # Checkout Pro (Preferência de pagamento)
        pref_items = []
        for it in order.items:
            pref_items.append({
                "title": it.name[:255],
                "quantity": it.quantity,
                "unit_price": float(it.unit_price),
                "currency_id": "BRL"
            })

        if float(order.shipping_amount) > 0:
            pref_items.append({
                "title": f"Frete - {order.shipping_service_name or 'Nacional'}",
                "quantity": 1,
                "unit_price": float(order.shipping_amount),
                "currency_id": "BRL"
            })

        pref_payload = {
            "items": pref_items,
            "payer": {
                "name": customer_snap.get("full_name") or "Cliente",
                "email": customer_snap.get("email") or "cliente@exemplo.com"
            },
            "back_urls": {
                "success": redirect_url,
                "pending": redirect_url,
                "failure": redirect_url
            },
            "auto_return": "approved",
            "external_reference": order.order_number,
            "notification_url": webhook_url
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(f"{MP_API_BASE}/checkout/preferences", json=pref_payload, headers=headers)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    sandbox = config.get("sandbox", False)
                    checkout_url = data.get("sandbox_init_point") if sandbox else data.get("init_point")
                    return {
                        "provider": "mercadopago",
                        "checkout_url": checkout_url,
                        "transaction_id": str(data.get("id")),
                        "raw_response": data
                    }
                else:
                    logger.warning(f"Erro ao criar preferência Mercado Pago: {resp.text}")
                    return {
                        "provider": "mercadopago",
                        "error": resp.text,
                        "checkout_url": None
                    }
        except Exception as e:
            logger.error(f"Erro na chamada Mercado Pago: {e}")
            return {"provider": "mercadopago", "error": str(e), "checkout_url": None}

    async def verify_payment(
        self,
        reference_data: Dict[str, Any],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        access_token = tenant_credentials.get("access_token")
        payment_id = reference_data.get("payment_id") or reference_data.get("id")

        if not access_token or not payment_id:
            return {"paid": False, "reason": "Missing access_token or payment_id"}

        headers = {"Authorization": f"Bearer {access_token.strip()}"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{MP_API_BASE}/v1/payments/{payment_id}", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status")
                    is_paid = status == "approved"
                    order_number = data.get("external_reference")
                    return {
                        "paid": is_paid,
                        "status": "paid" if is_paid else status,
                        "order_number": order_number,
                        "transaction_id": str(payment_id),
                        "payment_method": data.get("payment_method_id", "mercadopago"),
                        "raw_response": data
                    }
                return {"paid": False, "reason": f"HTTP {resp.status_code}: {resp.text}"}
        except Exception as e:
            return {"paid": False, "error": str(e)}

    async def handle_webhook(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str],
        tenant_credentials: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Recebe notificação IPN ou Webhook v1 do Mercado Pago.
        """
        payment_id = (
            payload.get("data", {}).get("id") or
            payload.get("id") or
            payload.get("resource", "").split("/")[-1]
        )

        topic = payload.get("type") or payload.get("topic")
        if topic and topic not in ("payment", "merchant_order"):
            return {"status": "ignored", "reason": f"Topic '{topic}' not handled"}

        if not payment_id:
            return {"status": "ignored", "reason": "No payment_id in webhook payload"}

        verification = await self.verify_payment(
            {"payment_id": payment_id},
            tenant_credentials,
            config
        )

        if verification.get("paid") is True:
            return {
                "order_number": verification.get("order_number"),
                "status": "paid",
                "transaction_id": str(payment_id),
                "payment_method": verification.get("payment_method", "mercadopago"),
                "raw_response": verification
            }
        else:
            return {
                "order_number": verification.get("order_number"),
                "status": verification.get("status", "pending"),
                "transaction_id": str(payment_id),
                "raw_response": verification
            }
