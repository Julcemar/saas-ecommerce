# Script para rodar o Backend FastAPI na porta 8001
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Iniciando Backend SaaS Multi-Tenant na porta 8001..." -ForegroundColor Green
Write-Host "Documentação Swagger: http://localhost:8001/api/docs" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
