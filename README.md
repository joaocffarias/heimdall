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
- Servidor remoto ou máquina local com **Docker** e **Docker Compose** instalados.
- Caso utilize ambiente remoto, certifique-se de que as portas `80`, `443`, `4000` e `9001` estão abertas no firewall para acesso.

### 2. Configurações Iniciais
O sistema requer variáveis de ambiente configuradas antes de inicializar.

1. **Gere o arquivo de ambiente** copiando o template padrão:
   ```bash
   cp .env.example .env
   ```
2. **Edite o `.env`**: Abra o arquivo `.env` gerado e preencha as credenciais. 
   - Configure o `SMTP_*` com suas credenciais de e-mail.
   - As variáveis `WEB_URL`, `API_URL` e `MINIO_PUBLIC_URL` devem apontar para o IP da sua rede ou o domínio da sua máquina host.

### 3. Subindo a Infraestrutura
A aplicação está empacotada com Docker Compose para subir banco de dados, storage, gateway e a aplicação em si.

Para fazer o build e iniciar todos os containers em background:
```bash
docker compose up -d --build
```
*(A primeira execução pode demorar alguns minutos para baixar as imagens e construir os serviços).*

### 4. Seed do Banco (Criando Administradores e Tenant)
Depois que os containers estiverem online, inicialize o banco de dados e insira os dados base (como o usuário Mestre `SUPER_ADMIN`):

Se você utiliza o Makefile:
```bash
make migrate
make seed
```

Ou rodando diretamente pelo Docker:
```bash
docker exec -it heimdall_api npx prisma migrate deploy
docker exec -it heimdall_api npm run seed
```

### 5. Acessar a Aplicação

Acesse no seu navegador usando o IP ou domínio configurado no seu servidor (ou `localhost` se estiver rodando na sua própria máquina):

- **Painel Administrativo e Portaria**: `https://<IP_OU_DOMINIO>` (Nginx configurado como proxy reverso atuando na porta 443).
- **Swagger Documentation API (Dev)**: `http://<IP_OU_DOMINIO>:4000/docs`
- **MinIO Console (Painel de Storage)**: `http://<IP_OU_DOMINIO>:9001` (para gerenciar os buckets de imagens manualmente).

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
