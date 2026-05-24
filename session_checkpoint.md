# Session Checkpoint - Heimdall

**Data/Hora**: 12/05/2026 - 23:37h
**Localização do Repositório**: `/usr/local/heimdall`

## Estado Atual da Arquitetura

Arquitetura robusta baseada em TypeScript, NestJS, Next.js, Postgres, Redis, MinIO e Docker. O sistema opera em modo **multi-tenant**, com suporte a configurações personalizadas por OM (Organização Militar). Autenticação híbrida (LDAP + senha local), notificações dinâmicas (WhatsApp via Evolution API + e-mail SMTP) e fluxo completo de autorização de saída com assinatura digital.

---

## Progresso Acumulado (Implementado e Validado ✔️)

### Sessão Anterior (até 22/04/2026)
- Identidade visual, rebranding (OM), logotipo dinâmico, favicon
- Relatórios PDF em paisagem com colunas de auditoria
- Painel Admin com persistência de `settings` JSON por tenant
- Estabilidade de sessão e correção de rotas no backend

---

### Sessão de Hoje (12/05/2026)

#### 1. Autenticação via LDAP (Multi-Tenant)
- Integração da biblioteca `ldap-authentication` no `AuthService`.
- Autenticação **híbrida**: tenta LDAP (com configuração dinâmica do Tenant), faz fallback para senha local se LDAP não estiver configurado.
- **Prioridade**: `Tenant.settings` > `process.env` para todas as configurações de integração.

#### 2. Interface de Configurações (Admin)
- Nova aba **"Configurações do Sistema"** (`/admin/settings`) com:
  - Configuração e teste de conexão **LDAP / Active Directory** (modal de teste em tempo real).
  - Configuração de **e-mail (SMTP)**: host, porta, usuário, senha, remetente.
  - Configuração de **WhatsApp (Evolution API)**: URL, API Key, instância.
- Removido o toggle **"Obrigar Autorização para Saída de Material"** — a autorização passou a ser obrigatória para toda saída.

#### 3. Notificações Dinâmicas
- `NotificationsService` busca configurações de SMTP e Evolution API do `Tenant.settings` antes de usar as variáveis globais de ambiente.
- Templates atualizados para refletir o novo fluxo de saída (observações genéricas, sem menção exclusiva a "alteração de material").

#### 4. Refatoração do Fluxo de Saída — Autorização Obrigatória
- **Toda saída exige autorização do responsável** — eliminado o caminho de liberação direta.
- Modais do Dashboard e da tela de Detalhes da Visita atualizados:
  - Removidos radio buttons "Não, tudo igual" / "Sim, houve alteração".
  - Campo de "Observações da Portaria (opcional)" substituiu a descrição obrigatória de alteração.
  - Botão sempre exibe **"Solicitar Autorização"**.

#### 5. Nova Máquina de Estados da Visita — `IN_PREMISES`
Reestruturação completa do ciclo de vida das visitas:

| Etapa | Status | Quem age |
|---|---|---|
| Entrada registrada | 🔵 `IN_PREMISES` — *Nas Dependências* | Sistema (automático) |
| Porteiro solicita saída | 🟣 `UNDER_REVIEW` — *Em Análise* | Porteiro |
| Responsável aprova | 🟢 `APPROVED` — *Saída Autorizada* | Responsável (link público) |
| Porteiro confirma saída física | ⚪ `COMPLETED` — *Concluído* | Porteiro |
| Responsável rejeita | 🔴 `REJECTED` — *Rejeitado* | Responsável (link público) |

**Arquivos alterados para este fluxo:**
- `api/prisma/schema.prisma`: adição de `IN_PREMISES` ao enum `VisitStatus`.
- Banco de dados: `ALTER TYPE "VisitStatus" ADD VALUE 'IN_PREMISES'` executado diretamente.
- `api/src/visits/visits.service.ts`: criação de visitas em `IN_PREMISES`; `requestExitReview` exige `IN_PREMISES`; `registerExit` exige `APPROVED`; estatísticas incluem `inPremises`.
- `api/src/signatures/signatures.service.ts`: aprovação leva para `APPROVED` (não `COMPLETED`); `exitAt` não é mais gravado aqui.
- `web/src/lib/types.ts`: `IN_PREMISES` adicionado ao tipo `VisitStatus` e à interface `DailyStats`.
- `web/src/lib/utils.ts`: label "Nas Dependências", badge azul, dot azul; `APPROVED` → "Saída Autorizada".
- `web/src/app/globals.css`: nova classe `.badge-in-premises`.
- `web/src/app/(auth)/dashboard/page.tsx`:
  - 7 cards de estatísticas (incluindo "Nas Dependências").
  - Botão `DoorOpen` apenas para `IN_PREMISES` (abre modal de solicitação).
  - Botão `CheckCircle2` apenas para `APPROVED` (confirma saída física — `handleFinalExit`).
- `web/src/app/(auth)/visits/[id]/page.tsx`:
  - Banners separados para `IN_PREMISES` (azul) e `APPROVED` (verde).
  - Botões equivalentes ao Dashboard.

---

## Estado dos Containers

Todos os containers estão **rodando e saudáveis**:
- `heimdall_web` — Next.js (frontend)
- `heimdall_api` — NestJS (backend)
- `heimdall_postgres` — PostgreSQL com enum atualizado
- `heimdall_redis` — Cache/sessões
- `heimdall_minio` — Armazenamento de objetos (fotos, assinaturas, PDFs)

---

## Próximos Passos Sugeridos
1. **Testes End-to-End**: Validar o fluxo completo: entrada → solicitação → assinatura → liberação.
2. **Configuração de Sessão Dinâmica**: Integrar `sessionTimeout` do `Tenant.settings` no middleware JWT.
3. **Filtros no Relatório**: Adicionar filtros por tipo de visitante (Civil/Militar) e por responsável.
4. **Migração de dados**: Visitas existentes com status `APPROVED` (antes significava "dentro") devem ser avaliadas — podem ser migradas para `IN_PREMISES` se ainda estiverem em aberto.

> *Atenção: Os containers `api` e `web` foram reconstruídos e estão rodando as versões mais recentes. O enum `IN_PREMISES` foi inserido diretamente no PostgreSQL com `ALTER TYPE` após o `prisma db push` não detectar a alteração automaticamente (comportamento esperado para enums pré-existentes).*
