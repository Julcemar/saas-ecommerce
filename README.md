# Plataforma SaaS de E-commerce Multi-Tenant de Alta Conversão

Núcleo completo da plataforma SaaS multi-tenant para produtos personalizados, brindes corporativos e atacado B2B, projetado para rodar em um único servidor Linux via Docker Compose com Caddy, On-Demand TLS e **Arquitetura de Módulos Plugáveis por Lojista (InfinitePay, Mercado Pago, Melhor Envio e Correios)**.

---

## 1. Arquitetura da Stack

- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 (Async) + Alembic + Pydantic v2 + dnspython + cryptography (Fernet).
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS com design system Neo-Brutalista / Pop-Art (HQ) e injeção dinâmica de CSS variables (`--color-primary`, `--color-secondary`, logo e nome da loja).
- **Banco de Dados & Cache:** PostgreSQL 16 (isolamento lógico compartilhado com `tenant_id` e índices compostos) + Redis 7 (cache de 5 min para resolução ultra-rápida de tenants).
- **Edge Reverse Proxy:** Caddy v2 com suporte a subdomínios wildcard (`*.seusistema.com.br`) e **On-Demand TLS** (`on_demand_tls`) consultando o endpoint interno `/api/internal/verify-domain?domain={host}`.
- **Segurança de Credenciais:** Criptografia simétrica em repouso (`cryptography.fernet.Fernet`) para o campo `credentials_encrypted` com chave de 32 bytes do ambiente (`ENCRYPTION_KEY`) e mascaramento rigoroso (`••••••••1234`) na API para o frontend.

---

## 2. Estrutura de Diretórios

```
sass-ecommerce/
├── docker-compose.yml          # Orquestração dos 5 serviços (api, frontend, postgres, redis, caddy)
├── Caddyfile                   # Configuração de proxy reverso, wildcard e SSL on-demand
├── schema.sql                  # Schema DDL oficial do PostgreSQL com índices e enums
├── BLUEPRINT.md                # Especificação funcional, visual Pop-Art e regras de negócio
├── README.md                   # Documentação técnica e guia de execução
├── .env / .env.example         # Variáveis de ambiente
│
├── backend/                    # API FastAPI Assíncrona
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── migrations/             # Migrações Alembic
│   └── app/
│       ├── main.py             # Aplicação FastAPI, CORS, rotas de upload e lifespan
│       ├── config.py           # Configurações Pydantic Settings
│       ├── database.py         # SQLAlchemy Async Engine e SessionLocal
│       ├── redis_client.py     # Cliente Redis assíncrono com TTL de 5 min
│       ├── models/             # Modelos relacionais (Tenant, User, Product, Order, TenantIntegration)
│       ├── schemas/            # Schemas Pydantic v2
│       ├── middleware/
│       │   └── tenant.py       # Interceptação de Host/Subdomínio e injeção de tenant
│       ├── security/
│       │   ├── auth.py         # JWT Tokens e Bcrypt Password Hashing
│       │   └── encryption.py   # Criptografia simétrica Fernet e mascaramento de chaves
│       ├── integrations/       # Módulos Plugáveis por Lojista
│       │   ├── registry.py     # Registry / Factory de provedores
│       │   ├── payment/
│       │   │   ├── base.py         # PaymentProviderInterface (create_checkout, handle_webhook, verify_payment)
│       │   │   ├── infinitepay.py  # InfinitePay com trava server-to-server obrigatória (payment_check)
│       │   │   └── mercadopago.py  # Mercado Pago (Pix Direto e Checkout Pro)
│       │   └── shipping/
│       │       ├── base.py         # ShippingProviderInterface (calculate_rates unificado)
│       │       ├── melhorenvio.py  # Melhor Envio OAuth2 completo + cálculo multi-transportadora
│       │       └── correios.py     # Correios Contrato Direto (SEDEX/PAC)
│       ├── services/
│       │   ├── tenant_service.py   # Provisionamento no Onboarding
│       │   ├── dns_service.py      # Resolução e validação CNAME via dnspython
│       │   └── order_service.py    # Motor de cálculo progressivo de atacado e Pix
│       └── api/
│           ├── router.py
│           └── endpoints/
│               ├── internal.py     # Endpoint /api/internal/verify-domain para o Caddy
│               ├── onboarding.py   # Self-Service Onboarding e validação de slug
│               ├── auth.py         # Login e perfil do lojista
│               ├── tenant.py       # Configuração de cores e domínio próprio
│               ├── categories.py   # CRUD de categorias isolado por tenant
│               ├── products.py     # CRUD de produtos e faixas de atacado
│               ├── orders.py       # Checkout, geração de Pix e gestão de pedidos
│               ├── admin_metrics.py# Métricas de faturamento GMV e kanban de produção
│               ├── uploads.py      # Upload de artes e fotos com validação MIME
│               ├── integrations.py # Gestão dos Módulos Plugáveis (/admin/integracoes)
│               ├── shipping.py     # Cálculo dinâmico em paralelo (asyncio.gather)
│               ├── payment_gateways.py # Gateways de pagamento ativos para o checkout
│               ├── webhooks.py     # Webhooks com validação server-to-server
│               └── storefront.py   # Banners da vitrine
│
└── frontend/                   # Aplicação Next.js 14 App Router
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.js       # Tokens Neo-Brutalistas / Pop-Art (bordas comic e sombras duras)
    ├── next.config.mjs
    └── src/
        ├── app/
        │   ├── layout.tsx       # Injeção dinâmica de CSS variables e fontes Montserrat/Inter
        │   ├── globals.css      # Design System Pop-Art (.btn-primary, .card-comic, etc.)
        │   ├── page.tsx         # Roteamento inteligente (Landing SaaS ou Home da Loja)
        │   ├── onboarding/      # Wizard de criação de conta e validação em tempo real de slug
        │   ├── produto/[slug]/  # Single Product com tabela de atacado interativa e upload de arte
        │   ├── carrinho/        # Carrinho com resumo sticky e recálculo progressivo
        │   ├── checkout/        # Checkout One-Page nacional com frete concorrente e gateways ativos
        │   ├── pedido/[id]/obrigado/ # Confirmação com QR Code Pix dinâmico e link WhatsApp
        │   └── admin/           # Painel do Lojista
        │       ├── layout.tsx   # Sidebar administrativo com link para Módulos Plugáveis
        │       ├── page.tsx     # Dashboard de GMV, ticket médio e kanban de pedidos
        │       ├── login/       # Autenticação do lojista
        │       ├── integracoes/ # Painel de ativação, credenciais e testes de módulos
        │       ├── produtos/    # CRUD completo com faixas de atacado progressivo
        │       ├── categorias/  # Gestão de categorias
        │       ├── pedidos/     # Fila de produção industrial e download de artes
        │       └── dominio/     # Configuração de domínio próprio e verificação DNS ao vivo
        ├── components/          # Header, Footer, WholesaleTable, CustomizationBox, ProductCard
        └── lib/                 # Cliente API e utilitários
```

---

## 3. Módulos Plugáveis por Lojista (`tenant_integrations`)

Cada lojista gerencia suas próprias integrações financeiras e logísticas de forma 100% isolada através da rota `/admin/integracoes`.

### 3.1. Segurança de Credenciais
- Todas as chaves secretas, tokens de acesso e senhas são salvas no banco de dados na coluna `credentials_encrypted` criptografadas com **Fernet** (`ENCRYPTION_KEY`).
- A API nunca expõe tokens completos nas respostas: aplica a função `mask_credentials()` que mascara strings confidenciais como `••••••••1234`.
- Ao salvar credenciais via formulário, caso o campo contenha a máscara `••••`, o backend preserva a chave existente sem corromper o valor real.

### 3.2. Provedor InfinitePay (Checkout Oficial)
- **Configurações:** `handle` (InfiniteTag sem `$`), `api_key` (opcional, `inchk_...`), `assured_installments` (0 a 12).
- **Criação de Sessão:** `POST https://api.checkout.infinitepay.io/links` com itens em centavos, frete como item adicional e URLs de redirecionamento do próprio tenant.
- **Trava de Segurança Obrigatória:** No webhook em `/api/webhooks/infinitepay/{tenant_id}`, o sistema **nunca aprova o pedido pelo payload**. Executa obrigatoriamente a chamada server-to-server:
  ```http
  POST https://api.checkout.infinitepay.io/payment_check
  Content-Type: application/json

  {
    "handle": "minhaloja",
    "order_nsu": "PED-20261118-ABC123",
    "transaction_nsu": "trx-987"
  }
  ```
  O pedido só transiciona para `payment_confirmed` / `paid` se o retorno for estritamente `{"paid": true}`.

### 3.3. Provedor Mercado Pago (Checkout Pro & Pix)
- **Configurações:** `access_token` e `public_key`.
- Suporte a geração de Pix direto transparente ou Checkout Pro com auto-retorno e notificação IPN.
- Validação server-to-server em `/api/webhooks/mercadopago/{tenant_id}` consultando `GET https://api.mercadopago.com/v1/payments/{payment_id}`.

### 3.4. Provedor Melhor Envio (OAuth2 + Hub Multi-Transportadora)
- **Fluxo OAuth2 Completo:**
  - Botão **"Conectar com Melhor Envio"** em `/admin/integracoes`.
  - Callback em `/api/integrations/melhorenvio/callback` que troca o `code` por tokens e salva criptografado com renovação automática periódica.
- **Cotação em Tempo Real:** Consulta `POST /api/v2/me/shipment/calculate` enviando cubagem e peso agrupados dos itens.

### 3.5. Provedor Correios (Contrato Direto)
- **Configurações:** `usuario`, `codigo_acesso_apis`, `cartao_postagem`.
- Cotação oficial direta com tarifas negociadas pelo cliente para SEDEX e PAC.

---

## 4. Checkout Dinâmico da Vitrine

1. **Cálculo de Frete Concorrente (`asyncio.gather`):**
   - Ao preencher o CEP no Checkout, o frontend dispara `POST /api/shipping/calculate`.
   - O backend busca no banco apenas as integrações de frete marcadas como `is_active = True` daquele `tenant_id` e dispara cotações concorrentes em paralelo.
   - O cliente escolhe entre as transportadoras ativas (Correios, Jadlog, Loggi) e o total é recalculado.
2. **Gateways Ativos Dinâmicos:**
   - O Checkout consulta `GET /api/payment/active-gateways` e renderiza apenas os métodos autorizados pelo lojista (InfinitePay, Mercado Pago ou Pix nativo).

---

## 5. Como Executar via Docker Compose

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env

# 2. Iniciar todos os 5 containers
docker compose up -d --build

# 3. Acessar a plataforma:
# - Loja / Vitrine: http://localhost:3000
# - Painel Administrativo: http://localhost:3000/admin
# - Módulos Plugáveis: http://localhost:3000/admin/integracoes
# - Documentação Swagger: http://localhost:8000/api/docs
```
