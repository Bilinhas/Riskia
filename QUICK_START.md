# ⚡ Quick Start - 5 Minutos para Começar

## 1️⃣ Pré-requisitos (1 minuto)

Instale antes de começar:
- **Node.js 18+**: https://nodejs.org
- **MySQL 8.0+**: https://dev.mysql.com/downloads/mysql/
- **pnpm**: `npm install -g pnpm`

Verificar:
```bash
node --version    # v22.13.0 ou superior
pnpm --version    # 9.0.0 ou superior
mysql --version   # 8.0 ou superior
```

---

## 2️⃣ Extrair e Instalar (2 minutos)

```bash
# Descompactar
unzip mapa-risco-ia.zip
cd mapa-risco-ia

# Instalar dependências
pnpm install
```

---

## 3️⃣ Configurar Banco de Dados (1 minuto)

```bash
# Criar banco de dados
mysql -u root -p -e "CREATE DATABASE mapa_risco_ia CHARACTER SET utf8mb4;"

# Criar arquivo .env.local
cat > .env.local << 'EOF'
DATABASE_URL=mysql://root:sua_senha@localhost:3306/mapa_risco_ia
JWT_SECRET=chave_secreta_muito_longa_minimo_32_caracteres_aqui_ok
VITE_APP_TITLE=Mapa de Risco IA
VITE_APP_LOGO=/logo.svg
NODE_ENV=development
PORT=3000
EOF

# Executar migrations
pnpm db:push
```

---

## 4️⃣ Iniciar Servidor (1 minuto)

```bash
# Iniciar
pnpm dev

# Você verá:
# Server running on http://localhost:3000/
```

---

## 5️⃣ Usar a Aplicação (0 minutos)

Abra navegador: **http://localhost:3000**

1. Clique em **"Novo Mapa"**
2. Descreva seu ambiente:
   ```
   Escritório com 10 funcionários, computadores, ar condicionado
   ```
3. Clique **"Gerar Mapa"** (aguarde 30-60 segundos)
4. Veja a planta e os riscos identificados!

---

## 🎮 Funcionalidades Básicas

| Ação | Como Fazer |
|------|-----------|
| **Arrastar risco** | Clique e arraste o círculo |
| **Ver detalhes** | Passe mouse sobre o círculo |
| **Deletar risco** | Passe mouse + clique em X |
| **Adicionar risco** | Clique "Adicionar Risco" |
| **Exportar PDF** | Clique "Exportar PDF" |
| **Ver mapas salvos** | Clique "Meus Mapas" |

---

## 🐛 Problemas Comuns

| Problema | Solução |
|----------|---------|
| **Porta 3000 em uso** | `PORT=3001 pnpm dev` |
| **Erro de banco** | `mysql -u root -p` → `SHOW DATABASES;` |
| **Módulos não encontrados** | `rm -rf node_modules && pnpm install` |
| **Cores não aparecem** | Use navegador moderno (Chrome 111+) |

---

## 📚 Próximos Passos

- Ler `SETUP.md` para instruções completas
- Ler `README.md` para documentação detalhada
- Explorar código comentado em `client/src/pages/RiskMapEditor.tsx`
- Modificar estilos em `client/src/index.css`

---

## 🚀 Pronto!

Seu servidor está rodando. Aproveite! 🎉
