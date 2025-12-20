# Mapa de Risco IA - Aplicação Web de Geração Inteligente de Mapas de Risco Ocupacional

## 📋 Visão Geral

**Mapa de Risco IA** é uma aplicação web React.js que utiliza inteligência artificial para gerar mapas de risco ocupacional de forma inteligente e automatizada. A aplicação permite que usuários descrevam seus ambientes de trabalho em linguagem natural, e a IA gera automaticamente uma planta baixa em SVG e identifica riscos ocupacionais.

### Funcionalidades Principais

- **Geração de Plantas Baixas com IA**: Descreva seu ambiente e a IA gera uma planta baixa em SVG
- **Identificação Automática de Riscos**: IA identifica automaticamente riscos ocupacionais (acidental, químico, ergonômico, físico, biológico)
- **Visualização Interativa**: Círculos coloridos representam riscos, com tamanho proporcional à gravidade
- **Drag-and-Drop**: Reposicione riscos arrastando os círculos no mapa
- **Salvamento Automático**: Posições de riscos são salvas automaticamente com debounce de 1 segundo
- **Gerenciamento Manual**: Adicione ou remova riscos manualmente
- **Legenda Customizável**: Visualize todos os riscos com informações detalhadas
- **Exportação em PDF**: Exporte mapas como relatórios profissionais em PDF
- **Persistência em MySQL**: Todos os dados são salvos em banco de dados

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

| Camada | Tecnologia | Descrição |
|--------|-----------|-----------|
| **Frontend** | React 19 + TypeScript | Interface de usuário moderna |
| **Styling** | Tailwind CSS 4 | Estilos utilitários com cores OKLCH |
| **Roteamento** | Wouter | Roteamento leve e type-safe |
| **Backend** | Node.js + Express 4 | Servidor HTTP |
| **API** | tRPC 11 | Comunicação type-safe frontend-backend |
| **Banco de Dados** | MySQL | Persistência de dados |
| **ORM** | Drizzle ORM | Queries type-safe para MySQL |
| **Autenticação** | Manus OAuth | Sistema de autenticação integrado |
| **IA** | Claude/GPT via LLM | Geração de SVG e identificação de riscos |
| **Exportação** | html2canvas + jsPDF | Captura de elementos e geração de PDF |

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  RiskMapEditor.tsx → RiskMapCanvas.tsx → RiskLegend.tsx         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    tRPC Client (client/src/lib/trpc.ts)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│  server/routers.ts → server/db.ts → server/llm-helpers.ts       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │    MySQL     │   │   LLM API    │
            │  (Dados)     │   │  (IA)        │
            └──────────────┘   └──────────────┘
```

### Estrutura de Pastas

```
mapa-risco-ia/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Página inicial com lista de mapas
│   │   │   └── RiskMapEditor.tsx   # Editor principal de mapas (COMENTADO)
│   │   ├── components/
│   │   │   ├── RiskMapCanvas.tsx   # Canvas com SVG + círculos (COMENTADO)
│   │   │   ├── RiskLegend.tsx      # Legenda de riscos
│   │   │   ├── Header.tsx          # Header com navegação
│   │   │   └── DashboardLayout.tsx # Layout para dashboard
│   │   ├── hooks/
│   │   │   └── useDebounce.ts      # Hook de debounce (COMENTADO)
│   │   ├── lib/
│   │   │   └── trpc.ts             # Cliente tRPC (COMENTADO)
│   │   ├── utils/
│   │   │   └── pdfExport.ts        # Utilitário de exportação PDF
│   │   ├── App.tsx                 # Roteamento e layout
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Estilos globais
│   ├── public/                      # Arquivos estáticos
│   └── package.json
│
├── server/                          # Backend Node.js
│   ├── routers.ts                  # Procedures tRPC (COMENTADO)
│   ├── db.ts                       # Helpers de banco de dados
│   ├── llm-helpers.ts              # Integração com LLM
│   ├── _core/                      # Framework plumbing
│   │   ├── index.ts                # Servidor Express
│   │   ├── context.ts              # Contexto tRPC
│   │   ├── trpc.ts                 # Configuração tRPC
│   │   ├── oauth.ts                # Autenticação OAuth
│   │   └── ...
│   └── *.test.ts                   # Testes vitest
│
├── drizzle/                         # Banco de dados
│   └── schema.ts                   # Schema MySQL
│
├── shared/                          # Código compartilhado
│   └── const.ts                    # Constantes
│
└── README.md                        # Este arquivo
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** 18+ (recomendado 22.13.0)
- **npm** ou **pnpm** (recomendado pnpm 9+)
- **MySQL** 8.0+ (ou TiDB compatível)
- **Git** para clonar o repositório

### Passo 1: Clonar e Instalar Dependências

```bash
# Clonar repositório
git clone <seu-repositorio>
cd mapa-risco-ia

# Instalar dependências
pnpm install
```

### Passo 2: Configurar Variáveis de Ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
# Banco de Dados MySQL
DATABASE_URL=mysql://usuario:senha@localhost:3306/mapa_risco_ia

# Autenticação
JWT_SECRET=sua_chave_secreta_aqui_minimo_32_caracteres
VITE_APP_ID=seu_app_id_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# LLM (IA)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api_manus
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua_chave_frontend_manus

# Informações do Proprietário
OWNER_NAME=Seu Nome
OWNER_OPEN_ID=seu_open_id

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=seu_website_id

# App Info
VITE_APP_TITLE=Mapa de Risco IA
VITE_APP_LOGO=/logo.svg
```

**Nota**: Se estiver usando Manus, as variáveis de ambiente já estão configuradas automaticamente. Você só precisa configurar `DATABASE_URL` se usar banco de dados externo.

### Passo 3: Configurar Banco de Dados

```bash
# Criar banco de dados MySQL
mysql -u root -p -e "CREATE DATABASE mapa_risco_ia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Executar migrations (criar tabelas)
pnpm db:push
```

### Passo 4: Iniciar Servidor de Desenvolvimento

```bash
# Iniciar servidor (frontend + backend)
pnpm dev
```

Servidor estará disponível em: **http://localhost:3000**

### Passo 5: Acessar a Aplicação

1. Abra navegador em `http://localhost:3000`
2. Faça login com suas credenciais Manus OAuth
3. Clique em "Novo Mapa" para começar
4. Descreva seu ambiente de trabalho
5. Clique "Gerar Mapa" para IA gerar planta e identificar riscos

---

## 📚 Guia de Código

### Onde Ocorrem as Principais Funcionalidades

#### 1. **Geração de Planta Baixa com IA**

| Arquivo | Função | O que faz |
|---------|--------|----------|
| `client/src/pages/RiskMapEditor.tsx` | `handleGenerateMap()` | Coordena geração de mapa |
| `server/routers.ts` | `ai.generateFloorPlan` | Procedure tRPC que chama IA |
| `server/llm-helpers.ts` | `generateFloorPlan()` | Envia prompt ao Claude/GPT e retorna SVG |

**Fluxo**: Usuário descreve ambiente → `generateFloorPlanMutation.mutateAsync()` → Backend chama LLM → SVG retornado → Renderizado em `RiskMapCanvas`

#### 2. **Identificação Automática de Riscos**

| Arquivo | Função | O que faz |
|---------|--------|----------|
| `client/src/pages/RiskMapEditor.tsx` | `handleGenerateMap()` | Coordena identificação |
| `server/routers.ts` | `ai.identifyRisks` | Procedure tRPC que chama IA |
| `server/llm-helpers.ts` | `identifyRisks()` | Envia prompt ao Claude/GPT e retorna JSON |

**Fluxo**: Descrição do ambiente → `identifyRisksMutation.mutateAsync()` → Backend chama LLM → Array de riscos retornado → Círculos criados no mapa

#### 3. **Salvamento de Dados no MySQL**

| Arquivo | Função | O que faz |
|---------|--------|----------|
| `client/src/pages/RiskMapEditor.tsx` | `handleGenerateMap()` | Chama `createMapMutation` |
| `server/routers.ts` | `riskMaps.create` | Procedure tRPC para criar mapa |
| `server/db.ts` | `createRiskMap()` | Insere na tabela `risk_maps` |
| `drizzle/schema.ts` | `risk_maps` table | Define estrutura do banco |

**Fluxo**: Dados do mapa → `createMapMutation.mutateAsync()` → Backend insere em MySQL → ID retornado → Usado para adicionar riscos

#### 4. **Drag-and-Drop de Riscos**

| Arquivo | Função | O que faz |
|---------|--------|----------|
| `client/src/components/RiskMapCanvas.tsx` | `handleMouseDown()` | Inicia drag |
| `client/src/components/RiskMapCanvas.tsx` | `handleMouseMove()` | Atualiza posição durante drag |
| `client/src/pages/RiskMapEditor.tsx` | `handleUpdateRiskPosition()` | Atualiza estado local |
| `client/src/hooks/useDebounce.ts` | `useDebounce()` | Aguarda 1 segundo antes de salvar |

**Fluxo**: Usuário arrasta círculo → `handleMouseMove()` atualiza posição → `debouncedSavePosition()` aguarda 1 segundo → `updatePositionMutation.mutateAsync()` salva no BD

#### 5. **Exportação em PDF**

| Arquivo | Função | O que faz |
|---------|--------|----------|
| `client/src/pages/RiskMapEditor.tsx` | `handleExportPDF()` | Coordena exportação |
| `client/src/utils/pdfExport.ts` | `exportMapToPDF()` | Captura elemento e gera PDF |
| Bibliotecas | `html2canvas` | Captura elemento DOM como imagem |
| Bibliotecas | `jsPDF` | Cria documento PDF |

**Fluxo**: Usuário clica "Exportar PDF" → `handleExportPDF()` → `exportMapToPDF()` captura mapa com `html2canvas` → Gera PDF com `jsPDF` → Download automático

### Hooks React Utilizados

#### `useState` - Estado Local

```typescript
// RiskMapEditor.tsx
const [description, setDescription] = useState("");        // Descrição do ambiente
const [floorPlanSvg, setFloorPlanSvg] = useState(null);   // SVG gerado
const [risks, setRisks] = useState<Risk[]>([]);           // Array de riscos
const [mapId, setMapId] = useState<number | null>(null);  // ID do mapa
const [isLoading, setIsLoading] = useState(false);        // Estado de carregamento

// RiskMapCanvas.tsx
const [draggingRiskId, setDraggingRiskId] = useState(null);  // Qual risco está sendo arrastado
const [hoveredRiskId, setHoveredRiskId] = useState(null);    // Qual risco está em hover
```

#### `useRef` - Referências sem Re-render

```typescript
// RiskMapEditor.tsx
const canvasRef = useRef<HTMLDivElement>(null);           // Referência ao elemento DOM
const pendingSavesRef = useRef<Set<number>>(new Set());   // Rastreia salvamentos pendentes

// RiskMapCanvas.tsx
const containerRef = useRef<HTMLDivElement>(null);        // Referência ao container
const dragStateRef = useRef({...});                        // Estado do drag (não causa re-render)
```

#### `useEffect` - Efeitos Colaterais

```typescript
// RiskMapEditor.tsx
useEffect(() => {
  // Carregar mapa existente quando componente monta
  if (existingMap) {
    setDescription(existingMap.description);
    setFloorPlanSvg(existingMap.floorPlanSvg);
    setRisks(existingMap.risks);
  }
}, [existingMap]);

// RiskMapCanvas.tsx
useEffect(() => {
  // Gerenciar event listeners de mousemove e mouseup durante drag
  if (draggingRiskId === null) return;
  
  const handleMouseMove = (e: MouseEvent) => { /* ... */ };
  const handleMouseUp = () => { /* ... */ };
  
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  
  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, [draggingRiskId, onRiskPositionChange]);
```

#### `useCallback` - Otimização de Funções

```typescript
// RiskMapCanvas.tsx
const handleMouseDown = useCallback(
  (e: React.MouseEvent, riskId: number) => {
    // Função otimizada que não é recriada a cada render
    // Dependências: [risks]
  },
  [risks]
);
```

#### `useRoute` e `useLocation` - Roteamento (Wouter)

```typescript
// RiskMapEditor.tsx
const [, params] = useRoute("/editor/:mapId");           // Extrair parâmetro da URL
const existingMapId = params?.mapId ? parseInt(params.mapId) : null;

// Home.tsx
const [location, setLocation] = useLocation();           // Navegar para outra página
setLocation("/editor");
```

### tRPC - Comunicação com API

#### Queries (Leitura de Dados)

```typescript
// Carregar lista de mapas
const { data: maps, isLoading } = trpc.riskMaps.list.useQuery();

// Carregar mapa específico
const { data: existingMap } = trpc.riskMaps.get.useQuery(
  { mapId: 123 },
  { enabled: !!mapId }  // Só executar se mapId existe
);

// Obter dados do usuário autenticado
const { data: user } = trpc.auth.me.useQuery();
```

#### Mutations (Escrita de Dados)

```typescript
// Criar novo mapa
const createMapMutation = trpc.riskMaps.create.useMutation();
const result = await createMapMutation.mutateAsync({
  title: "Meu Mapa",
  description: "Descrição...",
  floorPlanSvg: "<svg>...</svg>",
  width: 1000,
  height: 800
});

// Adicionar risco
const addRiskMutation = trpc.risks.add.useMutation();
const result = await addRiskMutation.mutateAsync({
  mapId: 123,
  type: "ergonomic",
  severity: "high",
  label: "Postura inadequada",
  // ...
});

// Atualizar posição de risco
const updatePositionMutation = trpc.risks.updatePosition.useMutation();
await updatePositionMutation.mutateAsync({
  riskId: 456,
  xPosition: 600,
  yPosition: 450
});

// Deletar risco
const deleteRiskMutation = trpc.risks.delete.useMutation();
await deleteRiskMutation.mutateAsync({ riskId: 456 });

// IA: Gerar planta baixa
const generateFloorPlanMutation = trpc.ai.generateFloorPlan.useMutation();
const { svg, width, height } = await generateFloorPlanMutation.mutateAsync({
  description: "Escritório com 10 funcionários..."
});

// IA: Identificar riscos
const identifyRisksMutation = trpc.ai.identifyRisks.useMutation();
const risks = await identifyRisksMutation.mutateAsync({
  description: "Escritório com 10 funcionários..."
});
```

### Context API

**Nota**: Este projeto não utiliza Context API. A comunicação é feita via tRPC (type-safe) e props (passagem de estado entre componentes).

Se precisar adicionar Context API no futuro, seria para:
- Tema (dark/light mode)
- Autenticação global
- Notificações globais

---

## 🗄️ Banco de Dados

### Schema MySQL

```sql
-- Tabela de Mapas de Risco
CREATE TABLE risk_maps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  floorPlanSvg LONGTEXT NOT NULL,
  width INT DEFAULT 1000,
  height INT DEFAULT 800,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Riscos
CREATE TABLE risks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  map_id INT NOT NULL,
  type ENUM('acidental', 'chemical', 'ergonomic', 'physical', 'biological') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  xPosition INT NOT NULL,
  yPosition INT NOT NULL,
  radius INT DEFAULT 30,
  color VARCHAR(7) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (map_id) REFERENCES risk_maps(id) ON DELETE CASCADE
);
```

### Queries Principais

```typescript
// server/db.ts

// Listar mapas do usuário
export async function getUserRiskMaps(userId: string) {
  return db.select().from(riskMaps).where(eq(riskMaps.userId, userId));
}

// Obter mapa com todos os riscos
export async function getRiskMapWithRisks(mapId: number, userId: string) {
  const map = await db.select().from(riskMaps)
    .where(and(eq(riskMaps.id, mapId), eq(riskMaps.userId, userId)))
    .limit(1);
  
  const mapRisks = await db.select().from(risks)
    .where(eq(risks.mapId, mapId));
  
  return { map: map[0], risks: mapRisks };
}

// Criar mapa
export async function createRiskMap(data: CreateRiskMapInput) {
  return db.insert(riskMaps).values(data);
}

// Adicionar risco
export async function addRisk(data: AddRiskInput) {
  return db.insert(risks).values(data);
}

// Atualizar posição de risco
export async function updateRiskPosition(riskId: number, x: number, y: number) {
  return db.update(risks)
    .set({ xPosition: x, yPosition: y })
    .where(eq(risks.id, riskId));
}

// Deletar risco
export async function deleteRisk(riskId: number) {
  return db.delete(risks).where(eq(risks.id, riskId));
}

// Deletar mapa (cascata deleta riscos)
export async function deleteRiskMap(mapId: number) {
  return db.delete(riskMaps).where(eq(riskMaps.id, mapId));
}
```

---

## 🧪 Testes

### Executar Testes

```bash
# Rodar todos os testes
pnpm test

# Rodar testes em modo watch
pnpm test --watch

# Rodar teste específico
pnpm test auth.logout
```

### Testes Disponíveis

- `server/auth.logout.test.ts` - Teste de logout
- `server/riskMaps.test.ts` - Testes de CRUD de mapas
- `server/risks.test.ts` - Testes de CRUD de riscos
- `server/ai.test.ts` - Testes de integração com IA

---

## 🎨 Design e Estilo

### Cores por Tipo de Risco

| Tipo | Cor | Código |
|------|-----|--------|
| Acidental | Vermelho | `#FF6B6B` |
| Químico | Amarelo | `#FFD93D` |
| Ergonômico | Verde | `#6BCB77` |
| Físico | Azul | `#4D96FF` |
| Biológico | Rosa | `#FF6B9D` |

### Tamanho de Círculos por Gravidade

| Gravidade | Raio | Diâmetro |
|-----------|------|----------|
| Baixa | 20px | 40px |
| Média | 30px | 60px |
| Alta | 40px | 80px |
| Crítica | 50px | 100px |

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

```bash
# Verificar se MySQL está rodando
mysql -u root -p -e "SELECT 1;"

# Verificar DATABASE_URL em .env.local
echo $DATABASE_URL
```

### Erro: "LLM API key not found"

```bash
# Verificar variáveis de ambiente
echo $BUILT_IN_FORGE_API_KEY
echo $VITE_FRONTEND_FORGE_API_KEY
```

### Erro: "OKLCH color not supported"

Isso é esperado em navegadores antigos. Use cores RGB em vez de OKLCH:

```css
/* ❌ Não funciona em html2canvas */
background-color: oklch(50% 0.2 240);

/* ✅ Funciona */
background-color: rgb(100, 150, 200);
```

### Servidor não inicia

```bash
# Limpar cache
rm -rf node_modules .pnpm-store

# Reinstalar dependências
pnpm install

# Reiniciar servidor
pnpm dev
```

---

## 📝 Comentários no Código

Os seguintes arquivos contêm comentários detalhados explicando cada funcionalidade:

- ✅ `client/src/pages/RiskMapEditor.tsx` - Editor principal com fluxo completo
- ✅ `client/src/components/RiskMapCanvas.tsx` - Drag-and-drop e renderização
- ✅ `client/src/hooks/useDebounce.ts` - Hook de debounce
- ✅ `client/src/lib/trpc.ts` - Cliente tRPC
- ✅ `server/routers.ts` - Todas as procedures tRPC

---

## 📦 Dependências Principais

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@trpc/react-query": "^11.0.0",
    "tailwindcss": "^4.0.0",
    "drizzle-orm": "^0.31.0",
    "mysql2": "^3.6.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "wouter": "^3.0.0",
    "sonner": "^1.3.0",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "tsx": "^4.7.0"
  }
}
```

---

## 🚀 Deploy

### Manus Hosting (Recomendado)

1. Crie checkpoint: `pnpm webdev:checkpoint`
2. Clique no botão "Publish" na UI
3. Seu site estará disponível em `seu-projeto.manus.space`

### Vercel / Netlify

```bash
# Build para produção
pnpm build

# Deploy (seguir instruções do serviço)
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique a seção Troubleshooting acima
2. Consulte os comentários no código (especialmente `RiskMapEditor.tsx`)
3. Verifique logs do servidor: `pnpm dev` mostra erros em tempo real
4. Abra uma issue no repositório

---

## 📄 Licença

Este projeto é fornecido como está. Sinta-se livre para usar, modificar e distribuir.

---

## 🎯 Próximas Features Sugeridas

- [ ] Modo compartilhamento read-only com link compartilhável
- [ ] Histórico de versões com snapshots automáticos
- [ ] Impressão otimizada para papel A4
- [ ] Integração com sistemas de RRHH
- [ ] Relatórios comparativos entre mapas
- [ ] Alertas automáticos para riscos críticos
- [ ] Colaboração em tempo real (múltiplos usuários)
- [ ] Mobile app nativa

---

**Desenvolvido com ❤️ usando React, tRPC e IA**
