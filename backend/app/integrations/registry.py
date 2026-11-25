from typing import Dict, Optional
from app.integrations.payment.base import PaymentProviderInterface
from app.integrations.payment.infinitepay import InfinitePayPaymentProvider
from app.integrations.payment.mercadopago import MercadoPagoPaymentProvider
from app.integrations.shipping.base import ShippingProviderInterface
from app.integrations.shipping.melhorenvio import MelhorEnvioShippingProvider
from app.integrations.shipping.correios import CorreiosShippingProvider

_PAYMENT_PROVIDERS: Dict[str, PaymentProviderInterface] = {
    "infinitepay": InfinitePayPaymentProvider(),
    "mercadopago": MercadoPagoPaymentProvider(),
}

_SHIPPING_PROVIDERS: Dict[str, ShippingProviderInterface] = {
    "melhorenvio": MelhorEnvioShippingProvider(),
    "correios": CorreiosShippingProvider(),
}


def get_payment_provider(provider_name: str) -> Optional[PaymentProviderInterface]:
    return _PAYMENT_PROVIDERS.get(provider_name.lower())


def get_shipping_provider(provider_name: str) -> Optional[ShippingProviderInterface]:
    return _SHIPPING_PROVIDERS.get(provider_name.lower())
