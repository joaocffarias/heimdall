#!/usr/bin/env bash
# ============================================================
# Heimdall — Makefile de atalhos para operações no projeto
# ============================================================
.PHONY: help setup up down logs restart deploy status

REMOTE_HOST=192.168.18.223
REMOTE_USER=antigravity
REMOTE_PATH=/home/antigravity/heimdall

help:
	@echo "🛡️  Heimdall — Comandos Disponíveis"
	@echo "────────────────────────────────────"
	@echo "  make setup    — Copia .env.example para .env (primeira vez)"
	@echo "  make deploy   — Envia arquivos para o servidor e sobe containers"
	@echo "  make up       — Sobe containers no servidor remoto"
	@echo "  make down     — Para containers no servidor remoto"
	@echo "  make logs     — Exibe logs do servidor"
	@echo "  make restart  — Reinicia todos os containers"
	@echo "  make status   — Mostra status dos containers"
	@echo "  make migrate  — Executa migrations do Prisma"
	@echo "  make seed     — Executa seed inicial (superadmin)"

setup:
	@cp -n .env.example .env && echo "✅ .env criado! Configure as variáveis antes de continuar."

deploy:
	@echo "📦 Sincronizando arquivos com o servidor $(REMOTE_HOST)..."
	@rsync -avz --exclude='node_modules' --exclude='.next' --exclude='dist' \
		--exclude='minio-data' --exclude='postgres-data' --exclude='*.log' \
		./ $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_PATH)/
	@echo "🚀 Subindo containers no servidor..."
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose up -d --build"
	@echo "✅ Deploy concluído!"

up:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose up -d"

down:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose down"

logs:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose logs -f --tail=100"

restart:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose restart"

status:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose ps"

migrate:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose exec api npx prisma migrate deploy"

seed:
	@ssh $(REMOTE_USER)@$(REMOTE_HOST) "cd $(REMOTE_PATH) && docker compose exec api npx ts-node prisma/seed.ts"
