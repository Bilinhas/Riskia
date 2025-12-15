# Mapa de Risco IA - TODO

## Funcionalidades Principais

### Banco de Dados
- [x] Criar tabela `riskMaps` para armazenar mapas de risco
- [x] Criar tabela `risks` para armazenar riscos individuais
- [x] Criar tabela `riskTypes` para tipos de risco predefinidos
- [x] Executar migrações com `pnpm db:push`

### Backend - Integração com LLM
- [x] Implementar endpoint para gerar planta baixa em SVG via LLM
- [x] Implementar endpoint para identificar riscos automaticamente via LLM
- [x] Criar helpers para parsing de respostas do LLM

### Backend - tRPC Procedures
- [x] Criar procedure para criar novo mapa de risco
- [x] Criar procedure para listar mapas do usuário
- [x] Criar procedure para obter detalhes de um mapa
- [x] Criar procedure para adicionar risco a um mapa
- [x] Criar procedure para remover risco de um mapa
- [x] Criar procedure para atualizar posição de risco (drag and drop)
- [x] Criar procedure para atualizar dados de risco (gravidade, cor, etc)
- [x] Criar procedure para deletar mapa
- [ ] Adicionar testes vitest para procedures

### Frontend - Layout e Design
- [x] Definir paleta de cores elegante e minimalista
- [x] Configurar tipografia e espaçamento global
- [x] Criar layout principal da aplicação
- [x] Implementar navegação e header

### Frontend - Interface Principal
- [x] Criar componente de input para descrição do ambiente
- [x] Criar componente para exibir planta baixa (SVG)
- [x] Criar componente para exibir círculos de risco
- [x] Implementar visualização de legenda de riscos

### Frontend - Interatividade
- [x] Implementar drag and drop para círculos de risco
- [x] Criar interface para adicionar novo risco
- [x] Criar interface para remover risco
- [x] Criar interface para editar propriedades de risco
- [x] Implementar customização de legenda

### Frontend - Integração
- [x] Conectar input de descrição ao backend
- [x] Integrar geração de planta baixa
- [x] Integrar identificação de riscos
- [x] Implementar salvamento de mapas
- [x] Implementar carregamento de mapas salvos

### Testes e Refinamento
- [x] Testar fluxo completo com exemplo do laboratório
- [x] Ajustar geração de planta baixa
- [x] Validar identificação de riscos
- [x] Otimizar performance do drag and drop
- [x] Refinar design e UX

### Deployment
- [x] Criar checkpoint final
- [x] Documentar instruções de uso
- [x] Preparar para publicação


## Bugs Encontrados e Correções

- [x] Corrigir sobreposição de riscos gerados automaticamente
- [x] Corrigir funcionalidade de adicionar riscos manualmente
- [x] Melhorar distribuição de riscos no mapa
- [x] Validar form de adição de riscos

## Bugs Críticos - Segunda Rodada

- [x] Corrigir drag-and-drop que agrupa riscos ao arrastar
- [x] Corrigir deleção que remove todos os riscos ao invés de um
- [x] Corrigir persistência de mapId e validação "mapa não foi criado"
