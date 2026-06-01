#!/usr/bin/env bash
# ============================================================
# Heimdall — Makefile de atalhos locais
# ============================================================
.PHONY: help install setup up down logs restart status migrate seed

help:
	@echo "🛡️  Heimdall — Comandos Disponíveis"
	@echo "────────────────────────────────────"
	@echo "  make install  — (RECOMENDADO) Instalação interativa e autodescoberta"
	@echo "  make setup    — Copia .env.example para .env (apenas se não existir)"
	@echo "  make up       — Sobe containers na máquina local"
	@echo "  make down     — Para containers na máquina local"
	@echo "  make logs     — Exibe logs do servidor"
	@echo "  make restart  — Reinicia todos os containers"
	@echo "  make status   — Mostra status dos containers"
	@echo "  make migrate  — Executa migrations do Prisma (banco)"
	@echo "  make seed     — Executa seed inicial (cria superadmin)"

install:
	@./install.sh

setup:
	@cp -n .env.example .env && echo "✅ .env criado! Configure as variáveis antes de continuar."

up:
	@docker compose up -d --build

down:
	@docker compose down

logs:
	@docker compose logs -f --tail=100

restart:
	@docker compose restart

status:
	@docker compose ps

migrate:
	@docker compose exec api npx prisma db push --accept-data-loss

seed:
	@docker compose exec api npm run seed
