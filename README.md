# 🛡️ Heimdall — Sistema de Controle de Materiais

Sistema completo, seguro e multi-estabelecimento para autorização de entrada e saída de materiais de visitantes.

## 🌟 Funcionalidades

- **Portaria (Tablet/PC)**: Registro de visitantes, categorias de materiais (eletrônico, ferramenta, etc) e captura de fotos diretas pelo browser (`react-webcam`).
- **Responsável (Celular/PC)**: Recebe notificação (E-mail, WhatsApp, SMS) com link mágico (sem a necessidade de login próprio) para revisar as fotos, dados do visitante e assinar digitalmente a autorização.
- **Assinatura Digital com Validade (Não-ICP)**: A assinatura manuscrita (via canvas touchscreen) gera um hash SHA-256 amarrado ao IP do signatário, data/hora e identificador da visita, garantindo não-repúdio local.
- **Relatórios**: Geração rápida de um comprovante final em PDF contendo o resumo e log da assinatura (`pdfmake`).
- **Avisos em Tempo Real**: WebSocket informa a portaria com um status ao vivo assim que o responsável aprova/rejeita.

## 🏗️ Arquitetura e Stack

- **Containers Docker**: PostgreSQL, Redis, MinIO (Object Storage), Evolution API (WhatsApp), Backend API, Frontend Web, Nginx (Proxy).
- **Backend**: Node.js com NestJS (TypeScript), Prisma ORM, BullMQ para filas asssíncronas.
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui, Zustand, react-hook-form.

## 🚀 Como Iniciar (Produção / Homologação)

### 1. Requisitos
- Servidor remoto com Docker e Docker Compose instalados.
- Se for local na sua máquina, rode via ssh ou diretamente na pasta do projeto.

### 2. Configurações Iniciais
Rode o atalho do Makefile para criar seu `.env` a partir do template:
```bash
make setup
```
Abra o `.env` gerado e preencha as credenciais. No `.env`, certifique-se de preencher `SMTP_*` e credenciais padrão para banco de dados e senhas. As variáveis `NEXT_PUBLIC_` precisam apontar para o IP/domínio da sua máquina host.

### 3. Deploy
Para copiar os arquivos para o servidor remoto e iniciar (conforme definido no seu `Makefile`):

```bash
make deploy
```
*(Certifique-se de que o Makefile contém o `REMOTE_HOST` correto).*

### 4. Seed do Banco (Criando Administradores e Tenant)
Depois que os containers estiverem saudáveis e online (aproximadamente após uns 15-20 segundos na primeira inicialização), rode as migrations e o Seed com o usuário Mestre (SUPER_ADMIN):

```bash
make migrate
make seed
```

### 5. Acessar a Aplicação

- **Frontend Interface (Portaria e Admin)**: `http://192.168.18.223` (Nginx mapeia a porta 80).
- **Swagger Documentation API (Dev)**: `http://192.168.18.223:4000/docs`
- **MinIO Console**: `http://192.168.18.223:9001` (para gerenciar os buckets de imagens manualmente).

### 🔑 Credenciais Padrão do Seed
- **SuperAdmin:** `superadmin@heimdall.local` / `admin@2025`
- **Portaria:** `portaria@heimdall.local` / `portaria@2025`

## 💬 WhatsApp via Evolution API (Configuração)
A infra do docker já levanta um gateway de WhatsApp isolado. Para configurar a instância do WhatsApp que vai mandar mensagens para os responsáveis:

1. Acesse o IP na porta 8080 ou utilize Postman para apontar para `http://<IP>:8080/instance/create`.
2. Configure com a sua key (`EVOLUTION_API_KEY`).
3. Gere e escaneie o QRCode na API.

## 📜 Licença
Projeto Open Source para uso livre.
