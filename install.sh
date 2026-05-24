#!/usr/bin/env bash
# ==============================================================================
# Heimdall - Instalação Automatizada (One-Click Deploy)
# ==============================================================================

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}🛡️  Iniciando Instalação do Heimdall (Automática)     ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Checar dependências
echo -e "\n${YELLOW}[1/5] Verificando dependências...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erro: Docker não está instalado.${NC} Por favor, instale o Docker primeiro."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Erro: Docker Compose V2 não está instalado.${NC} Por favor, instale o Docker Compose."
    exit 1
fi
echo -e "${GREEN}✓ Docker e Docker Compose encontrados.${NC}"

# 2. Descobrir IP e configurar .env
echo -e "\n${YELLOW}[2/5] Configurando ambiente (.env)...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Arquivo .env gerado a partir do template.${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env já existe, mantendo o atual.${NC}"
fi

# Detectar IP da máquina principal (Linux) ou usar localhost como fallback
IP_DETECTED=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$IP_DETECTED" ]; then
    IP_DETECTED="localhost"
    echo -e "${YELLOW}Aviso: Não foi possível detectar o IP. Usando 'localhost'.${NC}"
else
    echo -e "${GREEN}✓ IP detectado: ${IP_DETECTED}${NC}"
fi

# Ajustar IPs genéricos ou do exemplo antigo no .env
# Usamos sistema sed multiplataforma com delimitadores @ para evitar conflitos de barras
sed -i "s/192\.168\.18\.223/$IP_DETECTED/g" .env
sed -i "s/<IP_OU_DOMINIO>/$IP_DETECTED/g" .env

echo -e "${GREEN}✓ IPs atualizados no .env com sucesso.${NC}"

# 3. Subir infraestrutura
echo -e "\n${YELLOW}[3/5] Construindo e subindo os containers (isso pode demorar na 1ª vez)...${NC}"
docker compose up -d --build

# 4. Aguardar banco e rodar seeds
echo -e "\n${YELLOW}[4/5] Aguardando a inicialização da API (20 segundos)...${NC}"
sleep 20

echo -e "${YELLOW}Executando Migrations do banco de dados...${NC}"
docker compose exec -T api npx prisma migrate deploy

echo -e "${YELLOW}Inserindo dados iniciais (Seed)...${NC}"
docker compose exec -T api npm run seed

# 5. Conclusão
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "Acesse o Heimdall pelo seu navegador:\n"
echo -e "🔗 ${GREEN}Painel Principal:${NC} https://${IP_DETECTED}"
echo -e "🔗 ${GREEN}Documentação API:${NC} https://${IP_DETECTED}/api/docs"
echo -e "🔗 ${GREEN}Storage (MinIO):${NC}  http://${IP_DETECTED}:9001\n"
echo -e "${YELLOW}🔑 Credenciais de Acesso Padrão:${NC}"
echo -e "E-mail: superadmin@heimdall.local"
echo -e "Senha:  admin@2025"
echo -e "------------------------------------------------------"
echo -e "Lembre-se de trocar as senhas do sistema posteriormente!"
echo -e "${BLUE}======================================================${NC}"
