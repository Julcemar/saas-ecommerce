# Script para rodar o Frontend Next.js na porta 3001
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Iniciando Frontend Next.js na porta 3001..." -ForegroundColor Green
Write-Host "Vitrine / Landing Page: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Painel Administrativo:  http://localhost:3001/admin" -ForegroundColor Yellow
Write-Host "Integrações (Módulos):  http://localhost:3001/admin/integracoes" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\frontend"
npm run dev
