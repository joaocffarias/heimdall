# Session Checkpoint - Heimdall

**Data/Hora**: 23/05/2026
**Localização do Repositório**: `/usr/local/heimdall`

## Estado Atual da Arquitetura

Arquitetura robusta baseada em TypeScript, NestJS, Next.js, Postgres, Redis, MinIO e Docker. O sistema opera em modo **multi-tenant**, com suporte a configurações personalizadas por OM (Organização Militar). Autenticação híbrida (LDAP + senha local), notificações dinâmicas (WhatsApp via Evolution API + e-mail SMTP) e fluxo completo de autorização de saída com assinatura digital.

---

## Progresso Acumulado (Implementado e Validado ✔️)

### Sessões Anteriores
- Identidade visual, rebranding (OM), logotipo dinâmico, favicon.
- Relatórios PDF em paisagem com colunas de auditoria.
- Painel Admin com persistência de `settings` JSON por tenant.
- Estabilidade de sessão e correção de rotas no backend.
- Autenticação Híbrida (LDAP/Local).
- Fluxo de Saída com `IN_PREMISES` e Autorização Obrigatória de materiais.

---

### Sessão de Hoje (23/05/2026)

#### 1. Inserção Nativas de Imagens no Relatório de Visita
- Implementado o método abstrato `StorageService.get()` devolvendo Buffer via stream do MinIO.
- Reestruturada a engine `ReportsService` para consumir o `MaterialsService`, capturar as imagens originais de todos os materiais atrelados à visita (via MinIO) e renderizá-las embutidas (`base64`) de forma responsiva no formato final do PDF Individual da visita.

#### 2. Streaming Proxy de Imagens (Resolvendo Mixed Content e NxDomain)
- Identificado o problema que impedia o carregamento de URLs externas via Client-Side (`minio:9000` em tags `<img />` e requisições HTTPs mistas).
- Modificado o Controller para servir um streaming ativo (Proxy) das imagens seguras e pré-assinadas através dos endpoints `/api/visits/photos/:photoId/file` e `/api/public/sign/photos/:photoId/file`.
- Componente frontend `PhotoThumb` simplificado: remoção de `useState`/`useEffect` (não precisa mais de cache de links temporários), tornando a UI mais ágil e menos custosa, suportando a visualização em abas isoladas via IP primário da aplicação (HTTPS).

#### 3. Setup de Distribuição Universal
- Vinculado à conta do GitHub Oficial e submetida versão estável unificada.
- Criação de um módulo de instalação autônomo e de implantação contínua (`install.sh`), com suporte à identificação dinâmica do Hostname (IP Local).
- Simplificação do `Makefile` para delegar ações estritamente ao ambiente local em contêineres Docker (`make install`).
- `README.md` reescrito para utilizar placeholders visuais focados em abstrair a complexidade de deploy para futuros sysadmins.

---

## Estado dos Containers

Todos os containers estão **rodando e saudáveis** (Rebuild completo na sessão de hoje):
- `heimdall_web` — Next.js (frontend) (porta 3000 -> nginx:443)
- `heimdall_api` — NestJS (backend) (porta 4000)
- `heimdall_postgres` — PostgreSQL com enum atualizado
- `heimdall_redis` — Cache/sessões
- `heimdall_minio` — Armazenamento de objetos
- `heimdall_evolution` — Evolution API (WhatsApp)

---

## Próximos Passos Sugeridos
1. **Verificação E2E**: Testar relatórios globais de múltiplos inquilinos (Tenants) simultaneamente e confirmar integridade de logs com alto volume.
2. **Compressão**: Adicionar módulo de minificação no uploader (frontend) para compactar imagens de webcam e economizar tráfego do storage.
3. **Múltiplos Idiomas / Labels Customizáveis**: Aproveitar a arquitetura JSON de `settings` no BD para permitir que cada Tenant altere nomenclaturas padrões da plataforma.
