import logging
import dns.resolver
from typing import Tuple, Optional
from app.config import settings

logger = logging.getLogger(__name__)


def verify_cname_dns(custom_domain: str, target: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Verifica se o domínio possui um registro CNAME apontando para o target configurado.
    Retorna (is_verified, mensagem, cname_encontrado).
    """
    target = (target or settings.CNAME_TARGET).rstrip(".").lower()
    clean_domain = custom_domain.strip().lower()

    # Previne que o lojista tente colocar o próprio domínio do sistema
    if clean_domain in settings.MAIN_DOMAINS:
        return False, "Domínio reservado da plataforma.", None

    resolver = dns.resolver.Resolver()
    resolver.timeout = 5.0
    resolver.lifetime = 5.0

    try:
        answers = resolver.resolve(clean_domain, "CNAME")
        for rdata in answers:
            cname_str = str(rdata.target).rstrip(".").lower()
            logger.info(f"DNS Check for {clean_domain}: CNAME -> {cname_str} (Expected: {target})")
            if cname_str == target or target in cname_str:
                return True, "CNAME validado com sucesso! Domínio pronto para emissão SSL.", cname_str
            else:
                return False, f"CNAME aponta para '{cname_str}', mas o esperado é '{target}'.", cname_str
        return False, "Nenhum registro CNAME correspondente encontrado.", None
    except dns.resolver.NoAnswer:
        return False, "O domínio não possui nenhum registro CNAME configurado.", None
    except dns.resolver.NXDOMAIN:
        return False, "O domínio informado não foi encontrado (NXDOMAIN). Verifique se foi digitado corretamente.", None
    except dns.exception.Timeout:
        return False, "Tempo limite esgotado ao consultar os servidores DNS.", None
    except Exception as e:
        logger.error(f"Erro ao verificar DNS de {clean_domain}: {e}")
        return False, f"Falha na consulta DNS: {str(e)}", None
