import json
import logging
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Inicializa Fernet garantindo uma chave válida de 32 bytes."""
    key = settings.ENCRYPTION_KEY
    if not key:
        # Fallback de segurança gerando chave padrão para desenvolvimento
        key = Fernet.generate_key().decode()
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as e:
        logger.error(f"Erro ao inicializar Fernet com ENCRYPTION_KEY: {e}")
        # Se a chave for inválida, gera uma de emergência para não quebrar a inicialização
        fallback = Fernet.generate_key()
        return Fernet(fallback)


def encrypt_credentials(data: Dict[str, Any]) -> str:
    """Serializa um dicionário de credenciais em JSON e criptografa com Fernet."""
    if not data:
        return ""
    f = _get_fernet()
    raw_json = json.dumps(data, ensure_ascii=False)
    encrypted_bytes = f.encrypt(raw_json.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_credentials(encrypted_token: Optional[str]) -> Dict[str, Any]:
    """Descriptografa uma string Fernet e retorna o dicionário original de credenciais."""
    if not encrypted_token or not encrypted_token.strip():
        return {}
    f = _get_fernet()
    try:
        decrypted_bytes = f.decrypt(encrypted_token.strip().encode("utf-8"))
        return json.loads(decrypted_bytes.decode("utf-8"))
    except InvalidToken:
        logger.error("Falha ao descriptografar credenciais: Token ou chave inválida.")
        return {}
    except Exception as e:
        logger.error(f"Erro ao descriptografar credenciais: {e}")
        return {}


def mask_secret_string(val: Optional[str]) -> str:
    """Mascara chaves e tokens confidenciais mantendo apenas os últimos 4 caracteres."""
    if not val:
        return ""
    val_str = str(val).strip()
    if len(val_str) <= 4:
        return "••••••••"
    return f"••••••••{val_str[-4:]}"


def mask_credentials(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retorna uma cópia das credenciais com segredos mascarados
    para exibição segura no painel administrativo do lojista.
    """
    if not data:
        return {}

    masked = {}
    sensitive_keys = {
        "api_key", "secret", "client_secret", "access_token",
        "refresh_token", "codigo_acesso_apis", "webhook_secret",
        "token", "private_key"
    }

    for k, v in data.items():
        if k in sensitive_keys or any(s in k.lower() for s in ["secret", "token", "key", "password"]):
            masked[k] = mask_secret_string(v)
        else:
            masked[k] = v

    return masked
