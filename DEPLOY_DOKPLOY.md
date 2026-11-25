# Guia de Deploy no Dokploy via Git

Este projeto está configurado para deploy direto no **Dokploy** usando **Docker Compose** conectado ao seu repositório Git.

---

## O que foi ajustado para o Dokploy

1. **`docker-compose.yml` compatível com Dokploy:**
   - Removidos `container_name` de todos os serviços (permite que o Dokploy gerencie logs, deploys e nomes sem conflitos).
   - Removido o serviço `caddy` (o **Traefik** nativo do Dokploy gerencia domínios e SSL Let's Encrypt automaticamente).
   - Substituído `ports` por `expose` para evitar conflitos de portas no host da VPS.
   - Conectados `frontend` e `api` à rede externa `dokploy-network` e à rede interna `saas_network`.
   - Adicionado `healthcheck` no `postgres`, `redis` e `api`.

2. **Proxy de API Dinâmico (`frontend/src/app/api/[...path]/route.ts`):**
   - Encaminha `/api/*` para `http://api:8000` em tempo de execução, preservando `X-Forwarded-Host` (para resolução multi-tenant), `Authorization` e uploads de arquivos.

3. **Banco de Dados e Dockerfiles (`backend/app/database.py`, `backend/Dockerfile`, `frontend/Dockerfile`):**
   - `database.py` normaliza `postgres://` / `postgresql://` para `postgresql+asyncpg://` e mantém `@postgres:` funcionando dentro do Docker.
   - `frontend/public/.gitkeep` e `backend/uploads/.gitkeep` garantem que os diretórios existam após o `git clone`.

---

## Passo a passo no Painel do Dokploy

1. **Crie o projeto no Dokploy:**
   - Clique em **Create Service** -> **Docker Compose**.
   - Selecione seu provedor Git (GitHub/GitLab/etc.), o repositório e a branch `main`.
   - Em **Compose Path**, mantenha `./docker-compose.yml`.

2. **Configure as Variáveis de Ambiente (aba Environment):**
   Copie os valores do [.env.example](.env.example) e ajuste para o seu domínio e senhas fortes:
   ```env
   MAIN_DOMAINS=seudominio.com.br,app.seudominio.com.br
   CNAME_TARGET=cname.seudominio.com.br
   PLATFORM_BASE_URL=https://app.seudominio.com.br
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=sua-senha-forte-aqui
   POSTGRES_DB=ecommerce_saas
   SECRET_KEY=sua-chave-jwt-aleatoria-aqui
   ENCRYPTION_KEY=GTp1Y_2StR1idjKIEEShehpZXWbAKS3xlXSnom8lAoY=
   ```

3. **Configure o Domínio (aba Domains):**
   - Adicione seu domínio principal (ex: `app.seudominio.com.br` ou `*.seudominio.com.br`).
   - **Service Name:** `frontend`
   - **Container Port:** `3000`
   - Ative **HTTPS** (Let's Encrypt).
   - *(Opcional)* Se quiser expor a API diretamente (ex: `api.seudominio.com.br`), aponte para o serviço `api` na porta `8000`. Caso contrário, o próprio `frontend` já faz proxy de `/api/*` para `http://api:8000`.

4. **Faça o Deploy:**
   - Clique em **Deploy** (e ative **Auto Deploy** se quiser deploy automático a cada `git push`).

---

## Sincronizar Banco Local, Produtos e Imagens antes do Deploy

Antes de dar `git push`, rode o exportador local para gerar o snapshot completo do banco (`tenants`, `users`, `categories`, `products`, `product_variants`, `product_wholesale_tiers`, `storefront_banners`, `tenant_integrations`) e copiar todas as imagens de `backend/uploads/` para `backend/seed_data/`:

```powershell
python backend/export_local_to_seed.py
```

Na inicialização do container no Dokploy, o backend (`app/seed_sync.py`) importa automaticamente e de forma idempotente todos os registros faltantes para o PostgreSQL e restaura as imagens para `/app/uploads`.

---

## Subir para o Git (executar em `C:\Antigravity\saas-ecommerce`)

```powershell
python backend/export_local_to_seed.py
git add .
git status
git commit -m "chore: sincroniza banco, produtos e imagens para deploy no Dokploy"
git push
```
