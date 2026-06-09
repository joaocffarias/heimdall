# 🛡️ Heimdall — Sistema de Controle de Materiais

Sistema completo, seguro e multi-estabelecimento para autorização de entrada e saída de materiais de visitantes.

## 🌟 Funcionalidades

- **Portaria (Tablet/PC)**: Registro de visitantes, categorias de materiais (eletrônico, ferramenta, etc) e captura de fotos diretas pelo browser (`react-webcam`).
- **Autoridade Liberadora (Responsável)**: Recebe notificação (E-mail, WhatsApp, SMS) com link mágico (sem a necessidade de login próprio) para revisar as fotos, dados do visitante e assinar digitalmente a autorização de saída. O termo abrange Encarregados de Divisão, Chefes de Departamento e o Imediato.
- **Workflow de Liberação de Saída**: As visitas entram automaticamente com o status `IN_PREMISES`. O fluxo exige obrigatoriamente a verificação e solicitação de saída pela Portaria (`UNDER_REVIEW`), autorização pela Autoridade Liberadora (`APPROVED`) e o registro físico final de saída (`COMPLETED`).
- **Assinatura Digital com Validade (Não-ICP)**: A assinatura manuscrita (via canvas touchscreen) gera um hash SHA-256 amarrado ao IP do signatário, data/hora e identificador da visita, garantindo não-repúdio local.
- **Relatórios em PDF Avançados**: Geração rápida de comprovante em PDF contendo o resumo da visita, log da assinatura e anexos com as fotografias do visitante e dos materiais registrados.
- **Avisos em Tempo Real**: WebSocket informa a portaria com um status ao vivo assim que a Autoridade Liberadora aprova ou rejeita a saída.
- **Manutenção do Sistema (Backup/Restore)**: Interface de configuração avançada e scripts seguros em backend para criação de backups completos de banco de dados e arquivos estáticos, permitindo rápida restauração contra falhas.
- **Controle de Sessão e Segurança**: Timeout de sessão configurável em minutos, com detecção e monitoramento de inatividade em tempo real.

## 🏗️ Arquitetura e Stack

- **Containers Docker**: PostgreSQL, Redis, MinIO (Object Storage), Evolution API (WhatsApp), Backend API, Frontend Web, Nginx (Proxy).
- **Backend**: Node.js com NestJS (TypeScript), Prisma ORM, BullMQ para filas assíncronas.
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui, Zustand, react-hook-form.

## 🚀 Como Iniciar (Produção / Homologação)

### 1. Requisitos
- Servidor remoto ou máquina local com **Docker** e **Docker Compose** instalados.
- Caso utilize ambiente remoto, certifique-se de que as portas `80`, `443`, `4000` e `9001` estão abertas no firewall para acesso.

### 2. Instalação Automatizada (One-Click Deploy)
O sistema possui um script instalador universal que clona as configurações, descobre o IP da sua rede automaticamente e sobe toda a infraestrutura e o banco de dados.

Na pasta raiz do projeto, execute:

```bash
make install
```
*(Se você não tiver o make, pode rodar direto com `./install.sh`).*

O script solicitará a sua permissão/senhas se necessário, realizará o download das imagens Docker, criará o banco e exibirá, ao final, o link de acesso com as credenciais administrativas geradas para você.

### 3. Deploy Manual (Opcional)
Se desejar gerenciar container por container manualmente sem o script:
1. `cp .env.example .env` e configure suas variáveis.
2. `docker compose up -d --build`
3. `docker compose exec api npx prisma db push --accept-data-loss`
4. `docker compose exec api npm run seed`

### 4. Acessar a Aplicação

Acesse no seu navegador usando o IP ou domínio configurado no seu servidor (ou `localhost` se estiver rodando na sua própria máquina):

- **Painel Administrativo e Portaria**: `https://<IP_OU_DOMINIO>` (Nginx configurado como proxy reverso atuando na porta 443).
- **Swagger Documentation API (Dev)**: `http://<IP_OU_DOMINIO>:4000/docs`
- **MinIO Console (Painel de Storage)**: `http://<IP_OU_DOMINIO>:9001` (para gerenciar os buckets de imagens manualmente).

### 🔑 Credenciais Padrão do Seed
- **SuperAdmin:** `superadmin@heimdall.local` / `admin@2025`
- **Portaria:** `portaria@heimdall.local` / `portaria@2025`

## 💬 WhatsApp via Evolution API (Configuração)
A infra do docker já levanta um gateway de WhatsApp isolado. Para configurar a instância do WhatsApp que vai mandar mensagens para as autoridades liberadoras:

1. Acesse o IP na porta 8080 ou utilize Postman para apontar para `http://<IP>:8080/instance/create`.
2. Configure com a sua key (`EVOLUTION_API_KEY`).
3. Gere e escaneie o QRCode na API.

## 📜 Licença
Projeto Open Source para uso livre.
