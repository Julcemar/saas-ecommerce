# Guia de Deploy no Dado Cloud (`app.dado.cloud/deploys`)

Este projeto foi preparado para rodar via Git no **Dado Cloud** (PaaS gerenciada) ou via `docker-compose.yml`.

---

## O que foi ajustado no projeto para produção

1. **Proxy de API Dinâmico em Runtime (`frontend/src/app/api/[...path]/route.ts`):**
   - Lê `BACKEND_INTERNAL_URL` em tempo de execução (sem ficar preso ao valor do momento do `next build`).
   - Preserva `X-Forwarded-Host`, `X-Tenant-Slug`, `Authorization`, cookies e uploads binários.
2. **Suporte automático a `$PORT` nos Dockerfiles:**
   - `frontend/Dockerfile` e `backend/Dockerfile` respeitam a variável `PORT` injetada pelo Dado Cloud (com fallback para `3000` e `8000`).
   - `frontend/package.json` usa `"start": "next start"` sem porta fixa.
3. **Banco de dados resiliente (`backend/app/database.py`):**
   - Converte automaticamente URLs `postgres://` e `postgresql://` para `postgresql+asyncpg://`.
   - Mantém `@postgres:` intacto em produção / Docker (não redireciona mais para `127.0.0.1`).
4. **`.gitignore` e pastas rastreadas:**
   - Ignora `node_modules`, `.next`, `__pycache__`, `.env`, bancos `.db` locais e uploads.
   - Inclui `frontend/public/.gitkeep` e `backend/uploads/.gitkeep` para evitar falha de `COPY` no Docker build.

---

## Como configurar no Dado Cloud

Você pode fazer o deploy como **dois serviços conectados ao mesmo repositório Git** (recomendado para PaaS) + **PostgreSQL** e **Redis** gerenciados:

### 1. Banco de Dados e Cache
- Crie um **PostgreSQL 16** no Dado Cloud (e rode o `schema.sql` se quiser popular as tabelas/triggers iniciais, ou deixe o FastAPI criar as tabelas via SQLAlchemy).
- Crie um **Redis** no Dado Cloud (opcional, mas recomendado para cache de tenants).

### 2. Serviço Backend (FastAPI)
- **Root Directory / Contexto:** `backend`
- **Dockerfile:** `backend/Dockerfile`
- **Porta:** `8000` (ou automática via `$PORT`)
- **Healthcheck:** `/api/health`
- **Variáveis de Ambiente:**
  - `ENVIRONMENT=production`
  - `DATABASE_URL` = URL do PostgreSQL gerenciado
  - `REDIS_URL` = URL do Redis gerenciado
  - `SECRET_KEY` = chave secreta forte aleatória
  - `ENCRYPTION_KEY` = chave Fernet base64 de 32 bytes (ex: gerada com `Fernet.generate_key()`)
  - `MAIN_DOMAINS` = `seudominio.com.br,app.seudominio.com.br`
  - `CNAME_TARGET` = `cname.seudominio.com.br`
  - `UPLOAD_DIR` = `/app/uploads` *(monte um volume persistente em `/app/uploads` para não perder imagens enviadas nos deploys)*

### 3. Serviço Frontend (Next.js)
- **Root Directory / Contexto:** `frontend`
- **Dockerfile:** `frontend/Dockerfile`
- **Porta:** `3000` (ou automática via `$PORT`)
- **Variáveis de Ambiente:**
  - `NODE_ENV=production`
  - `BACKEND_INTERNAL_URL` = URL interna (ou pública HTTPS) do serviço Backend (ex: `http://api:8000` ou `https://api.seudominio.com.br`)

---

## Como enviar para o Git (Commit & Push)

Execute no terminal dentro da pasta `C:\Antigravity\saas-ecommerce`:

```powershell
git status
git add .
git commit -m "chore: prepara projeto para deploy em producao no Dado Cloud"
git push
```
