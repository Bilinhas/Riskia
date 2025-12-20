# 🚀 Guia Completo de Execução Local

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

| Software | Versão | Download |
|----------|--------|----------|
| **Node.js** | 18+ (recomendado 22.13.0) | https://nodejs.org |
| **npm** ou **pnpm** | Última versão | `npm install -g pnpm` |
| **MySQL** | 8.0+ ou TiDB | https://dev.mysql.com/downloads/mysql/ |
| **Git** | Qualquer versão | https://git-scm.com |

### Verificar Instalação

```bash
# Verificar Node.js
node --version
# Esperado: v22.13.0 ou superior

# Verificar npm/pnpm
pnpm --version
# Esperado: 9.0.0 ou superior

# Verificar MySQL
mysql --version
# Esperado: mysql Ver 8.0 ou superior
```

---

## 📦 Passo 1: Extrair e Preparar o Projeto

### 1.1 Extrair o arquivo ZIP

```bash
# Descompactar
unzip mapa-risco-ia.zip

# Entrar na pasta
cd mapa-risco-ia

# Listar conteúdo
ls -la
```

Você deve ver:

```
mapa-risco-ia/
├── client/                 # Frontend React
├── server/                 # Backend Node.js
├── drizzle/               # Banco de dados
├── package.json           # Dependências
├── README.md              # Documentação completa
├── SETUP.md              # Este arquivo
└── ...
```

### 1.2 Instalar Dependências

```bash
# Instalar todas as dependências (frontend + backend)
pnpm install

# Isso pode levar 2-5 minutos na primeira vez
# Você verá muitas linhas de output - é normal!
```

---

## 🗄️ Passo 2: Configurar Banco de Dados MySQL

### 2.1 Criar Banco de Dados

```bash
# Conectar ao MySQL (será solicitada a senha)
mysql -u root -p

# Dentro do MySQL, execute:
CREATE DATABASE mapa_risco_ia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verificar criação
SHOW DATABASES;

# Sair
EXIT;
```

### 2.2 Configurar Variáveis de Ambiente

Crie arquivo `.env.local` na raiz do projeto:

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local

# Editar com seu editor favorito
nano .env.local
# ou
code .env.local
# ou
vim .env.local
```

Preencha com seus valores:

```env
# BANCO DE DADOS
# Formato: mysql://usuario:senha@host:porta/database
DATABASE_URL=mysql://root:sua_senha@localhost:3306/mapa_risco_ia

# SEGURANÇA
# Gere com: openssl rand -base64 32
JWT_SECRET=sua_chave_secreta_muito_longa_aqui_minimo_32_caracteres

# APLICAÇÃO
VITE_APP_TITLE=Mapa de Risco IA
VITE_APP_LOGO=/logo.svg
NODE_ENV=development
PORT=3000

# DEIXE EM BRANCO (para desenvolvimento local sem OAuth)
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_NAME=Dev Local
OWNER_OPEN_ID=dev-local
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

### 2.3 Executar Migrations

```bash
# Criar tabelas no banco de dados
pnpm db:push

# Esperado: Você verá mensagens sobre criação de tabelas
# Exemplo: "✓ Successfully pushed database schema"
```

---

## 🎯 Passo 3: Iniciar Servidor de Desenvolvimento

### 3.1 Iniciar o Servidor

```bash
# Iniciar servidor (frontend + backend juntos)
pnpm dev

# Esperado: Você verá algo como:
# [13:50:19] Starting dev server with command: pnpm run dev
# [13:50:20] > mapa-risco-ia@1.0.0 dev
# [13:50:23] [OAuth] Initialized with baseURL: https://api.manus.im
# [13:50:23] Server running on http://localhost:3000/
```

### 3.2 Acessar a Aplicação

Abra seu navegador em:

```
http://localhost:3000
```

Você deve ver a página inicial do **Mapa de Risco IA**.

---

## 🎮 Passo 4: Usar a Aplicação

### 4.1 Primeira Execução (Sem Autenticação)

Como você não configurou OAuth, você pode acessar diretamente:

1. Clique em **"Novo Mapa"**
2. Descreva seu ambiente de trabalho:
   ```
   Escritório com 10 funcionários, 5 computadores, ar condicionado, 
   iluminação fluorescente, mesas de trabalho, cadeiras de escritório
   ```
3. Clique em **"Gerar Mapa"**
4. Aguarde a IA gerar a planta e identificar riscos (30-60 segundos)

### 4.2 Interagir com o Mapa

- **Arrastar Riscos**: Clique e arraste os círculos coloridos
- **Visualizar Detalhes**: Passe o mouse sobre um círculo para ver o rótulo
- **Deletar Risco**: Passe o mouse e clique no X vermelho
- **Adicionar Risco**: Clique em "Adicionar Risco" e preencha o formulário
- **Exportar PDF**: Clique em "Exportar PDF" para baixar relatório

### 4.3 Visualizar Mapas Salvos

Clique em **"Meus Mapas"** para ver todos os mapas criados.

---

## 🧪 Passo 5: Executar Testes (Opcional)

```bash
# Rodar todos os testes
pnpm test

# Esperado: Você verá resultados dos testes
# Exemplo: "✓ 7 passed"

# Rodar testes em modo watch (reexecuta ao salvar)
pnpm test --watch

# Rodar teste específico
pnpm test auth.logout
```

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

**Problema**: Aplicação não consegue conectar ao MySQL.

**Solução**:

```bash
# 1. Verificar se MySQL está rodando
mysql -u root -p -e "SELECT 1;"

# 2. Verificar DATABASE_URL em .env.local
cat .env.local | grep DATABASE_URL

# 3. Testar conexão manualmente
mysql -u root -p -h localhost -D mapa_risco_ia -e "SHOW TABLES;"

# 4. Se ainda não funcionar, reiniciar MySQL
# macOS:
brew services restart mysql

# Linux:
sudo systemctl restart mysql

# Windows:
net stop MySQL80
net start MySQL80
```

### Erro: "Port 3000 already in use"

**Problema**: Outra aplicação está usando a porta 3000.

**Solução**:

```bash
# Opção 1: Usar porta diferente
PORT=3001 pnpm dev

# Opção 2: Matar processo na porta 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erro: "OKLCH color not supported"

**Problema**: Navegador antigo não suporta cores OKLCH.

**Solução**: Use navegador moderno (Chrome 111+, Firefox 113+, Safari 16.4+).

### Erro: "Module not found"

**Problema**: Dependências não instaladas corretamente.

**Solução**:

```bash
# Limpar cache
rm -rf node_modules .pnpm-store

# Reinstalar
pnpm install

# Limpar build
pnpm clean

# Reiniciar servidor
pnpm dev
```

### Erro: "LLM API key not found"

**Problema**: Variáveis de LLM não configuradas.

**Solução**: Para desenvolvimento local sem IA, deixe em branco (já está configurado no .env.example).

---

## 📚 Estrutura de Pastas Importante

```
mapa-risco-ia/
│
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Página inicial
│   │   │   ├── RiskMapEditor.tsx   # Editor de mapas (COMENTADO)
│   │   │   └── SavedMaps.tsx       # Lista de mapas salvos
│   │   ├── components/
│   │   │   ├── RiskMapCanvas.tsx   # Canvas com SVG (COMENTADO)
│   │   │   ├── RiskLegend.tsx      # Legenda de riscos
│   │   │   └── Header.tsx          # Header/Navegação
│   │   ├── hooks/
│   │   │   └── useDebounce.ts      # Hook de debounce (COMENTADO)
│   │   ├── lib/
│   │   │   └── trpc.ts             # Cliente tRPC (COMENTADO)
│   │   └── App.tsx                 # Roteamento
│   └── public/                      # Arquivos estáticos
│
├── server/                          # Backend Node.js
│   ├── routers.ts                  # Procedures tRPC (COMENTADO)
│   ├── db.ts                       # Helpers de banco de dados
│   ├── llm-helpers.ts              # Integração com IA
│   └── _core/                      # Framework plumbing
│
├── drizzle/                         # Banco de dados
│   └── schema.ts                   # Schema MySQL
│
├── .env.example                     # Variáveis de exemplo
├── .env.local                       # Seu arquivo (criar)
├── README.md                        # Documentação completa
├── SETUP.md                         # Este arquivo
└── package.json                     # Dependências
```

---

## 🔧 Comandos Úteis

```bash
# Iniciar servidor
pnpm dev

# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start

# Rodar testes
pnpm test

# Rodar testes em watch mode
pnpm test --watch

# Linting (verificar código)
pnpm lint

# Type checking
pnpm type-check

# Atualizar banco de dados
pnpm db:push

# Resetar banco de dados
pnpm db:reset

# Ver logs do servidor
pnpm dev 2>&1 | tee server.log
```

---

## 📱 Acessar de Outro Computador

Se quiser acessar a aplicação de outro computador na mesma rede:

```bash
# Descobrir seu IP local
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig

# Exemplo: Se seu IP é 192.168.1.100
# Acesse de outro computador em:
http://192.168.1.100:3000
```

---

## 🎓 Próximos Passos

1. **Explorar o Código**: Leia os comentários em `RiskMapEditor.tsx` e `server/routers.ts`
2. **Modificar Estilos**: Edite `client/src/index.css` para customizar cores
3. **Adicionar Funcionalidades**: Siga o padrão tRPC (procedure → mutation → UI)
4. **Deploy**: Veja seção "Deploy" em `README.md`

---

## 💡 Dicas Importantes

- **Salvamento Automático**: Posições de riscos são salvas automaticamente com debounce de 1 segundo
- **Sem Refresh Necessário**: Dados são atualizados em tempo real sem recarregar a página
- **Comentários no Código**: Todos os arquivos principais têm comentários explicando cada funcionalidade
- **Type-Safe**: tRPC garante que frontend e backend estejam sempre sincronizados

---

## ❓ Perguntas Frequentes

**P: Preciso de autenticação para usar localmente?**
R: Não! Para desenvolvimento local, deixe VITE_APP_ID em branco. Você acessa direto.

**P: Posso usar outro banco de dados?**
R: Sim, mas você precisa editar `drizzle/schema.ts` e usar outro driver (PostgreSQL, SQLite, etc).

**P: Como adiciono IA de verdade?**
R: Configure as variáveis de LLM com suas chaves de API (OpenAI, Anthropic, etc).

**P: Posso usar em produção?**
R: Sim! Veja seção "Deploy" em `README.md` para instruções.

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique a seção **Troubleshooting** acima
2. Consulte os comentários no código
3. Verifique logs do servidor: `pnpm dev` mostra erros em tempo real
4. Leia `README.md` para mais detalhes

---

**Boa sorte! 🚀**
