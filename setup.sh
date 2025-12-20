#!/bin/bash

# ============================================================================
# SCRIPT: setup.sh - Configuração Automática do Projeto
# ============================================================================
# 
# Este script automatiza a configuração inicial do projeto.
# 
# Uso:
#   chmod +x setup.sh
#   ./setup.sh
# 

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# ============================================================================
# VERIFICAÇÕES INICIAIS
# ============================================================================

print_header "Verificando Pré-requisitos"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado. Instale em https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION encontrado"

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    print_info "pnpm não encontrado. Instalando..."
    npm install -g pnpm
fi
PNPM_VERSION=$(pnpm --version)
print_success "pnpm $PNPM_VERSION encontrado"

# Verificar MySQL
if ! command -v mysql &> /dev/null; then
    print_error "MySQL não encontrado. Instale em https://dev.mysql.com/downloads/mysql/"
    exit 1
fi
MYSQL_VERSION=$(mysql --version)
print_success "MySQL encontrado: $MYSQL_VERSION"

# ============================================================================
# INSTALAR DEPENDÊNCIAS
# ============================================================================

print_header "Instalando Dependências"

if [ -d "node_modules" ]; then
    print_info "node_modules já existe. Pulando instalação."
else
    print_info "Instalando dependências (isso pode levar alguns minutos)..."
    pnpm install
    print_success "Dependências instaladas"
fi

# ============================================================================
# CONFIGURAR BANCO DE DADOS
# ============================================================================

print_header "Configurando Banco de Dados"

# Solicitar credenciais MySQL
read -p "Usuário MySQL (padrão: root): " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-root}

read -sp "Senha MySQL: " MYSQL_PASSWORD
echo

read -p "Host MySQL (padrão: localhost): " MYSQL_HOST
MYSQL_HOST=${MYSQL_HOST:-localhost}

read -p "Porta MySQL (padrão: 3306): " MYSQL_PORT
MYSQL_PORT=${MYSQL_PORT:-3306}

read -p "Nome do banco (padrão: mapa_risco_ia): " DB_NAME
DB_NAME=${DB_NAME:-mapa_risco_ia}

# Testar conexão
print_info "Testando conexão com MySQL..."
if mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -h "$MYSQL_HOST" -P "$MYSQL_PORT" -e "SELECT 1;" &> /dev/null; then
    print_success "Conexão com MySQL bem-sucedida"
else
    print_error "Não foi possível conectar ao MySQL"
    print_error "Verifique suas credenciais e tente novamente"
    exit 1
fi

# Criar banco de dados
print_info "Criando banco de dados '$DB_NAME'..."
mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -h "$MYSQL_HOST" -P "$MYSQL_PORT" \
    -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    2>/dev/null || true
print_success "Banco de dados criado/verificado"

# ============================================================================
# CRIAR ARQUIVO .env.local
# ============================================================================

print_header "Criando Arquivo .env.local"

# Gerar JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "chave_secreta_minimo_32_caracteres_aqui_ok_ok_ok")

# Criar arquivo .env.local
cat > .env.local << EOF
# ============================================================================
# BANCO DE DADOS
# ============================================================================
DATABASE_URL=mysql://$MYSQL_USER:$MYSQL_PASSWORD@$MYSQL_HOST:$MYSQL_PORT/$DB_NAME

# ============================================================================
# SEGURANÇA
# ============================================================================
JWT_SECRET=$JWT_SECRET

# ============================================================================
# APLICAÇÃO
# ============================================================================
VITE_APP_TITLE=Mapa de Risco IA
VITE_APP_LOGO=/logo.svg
NODE_ENV=development
PORT=3000

# ============================================================================
# MANUS/OAUTH (deixe em branco para desenvolvimento local)
# ============================================================================
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_NAME=Dev Local
OWNER_OPEN_ID=dev-local

# ============================================================================
# LLM/IA (deixe em branco para desenvolvimento local)
# ============================================================================
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

# ============================================================================
# ANALYTICS (opcional)
# ============================================================================
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
EOF

print_success "Arquivo .env.local criado"
print_info "Arquivo salvo em: $(pwd)/.env.local"

# ============================================================================
# EXECUTAR MIGRATIONS
# ============================================================================

print_header "Executando Migrations de Banco de Dados"

print_info "Criando tabelas no banco de dados..."
pnpm db:push
print_success "Migrations executadas com sucesso"

# ============================================================================
# RESUMO FINAL
# ============================================================================

print_header "✓ Configuração Concluída com Sucesso!"

echo -e "${GREEN}Próximos passos:${NC}\n"
echo "1. Iniciar o servidor:"
echo -e "   ${YELLOW}pnpm dev${NC}\n"
echo "2. Abrir navegador:"
echo -e "   ${YELLOW}http://localhost:3000${NC}\n"
echo "3. Criar novo mapa:"
echo -e "   - Clique em 'Novo Mapa'"
echo -e "   - Descreva seu ambiente"
echo -e "   - Clique em 'Gerar Mapa'\n"

echo -e "${BLUE}Informações da Configuração:${NC}"
echo "  Banco de Dados: $DB_NAME"
echo "  Host: $MYSQL_HOST:$MYSQL_PORT"
echo "  Usuário: $MYSQL_USER"
echo "  Arquivo .env.local: $(pwd)/.env.local"
echo ""
echo -e "${BLUE}Documentação:${NC}"
echo "  - Quick Start: QUICK_START.md"
echo "  - Setup Completo: SETUP.md"
echo "  - Documentação: README.md"
echo ""

print_success "Tudo pronto! Execute 'pnpm dev' para iniciar."
