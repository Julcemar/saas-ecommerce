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

## Subir para o Git (executar em `C:\Antigravity\saas-ecommerce`)

```powershell
git init
git branch -M main
git add .
git status
git commit -m "chore: prepara projeto para deploy no Dokploy via Git"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```
