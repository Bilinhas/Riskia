/**
 * ============================================================================
 * PÁGINA: RiskMapEditor - Editor de Mapas de Risco Ocupacional
 * ============================================================================
 * 
 * Esta página é o coração da aplicação. Ela gerencia:
 * 1. Geração de plantas baixas em SVG via IA
 * 2. Identificação automática de riscos ocupacionais
 * 3. Persistência de dados no MySQL
 * 4. Drag-and-drop para posicionar riscos
 * 5. Salvamento automático de posições com debounce
 * 6. Exportação de mapas em PDF
 * 
 * FLUXO PRINCIPAL:
 * Usuário descreve ambiente → IA gera planta SVG → IA identifica riscos → 
 * Riscos são salvos no BD → Usuário pode arrastar riscos → Posições são salvas 
 * automaticamente → Usuário exporta PDF
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Share2, Download } from "lucide-react";
import { toast } from "sonner";
import RiskMapCanvas from "@/components/RiskMapCanvas";
import RiskLegend from "@/components/RiskLegend";
import Header from "@/components/Header";
import { useLocation, useRoute } from "wouter";
import { exportMapToPDF } from "@/utils/pdfExport";


// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface Risk {
  id: number;
  type: string;
  severity: string;
  label: string;
  description: string | null;
  xPosition: number;
  yPosition: number;
  radius: number;
  color: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function RiskMapEditor() {
  // ============================================================================
  // HOOKS DE ROTEAMENTO
  // ============================================================================
  
  // useRoute: Hook do Wouter para extrair parâmetros da URL
  // Exemplo: /editor/:mapId → params.mapId contém o ID do mapa
  const [, params] = useRoute("/editor/:mapId");
  const existingMapId = params?.mapId ? parseInt(params.mapId) : null;
  
  // ============================================================================
  // ESTADO LOCAL (useState)
  // ============================================================================
  
  // description: Texto que o usuário digita descrevendo o ambiente de trabalho
  // Exemplo: "Escritório com 10 funcionários, computadores, ar condicionado"
  const [description, setDescription] = useState("");
  
  // floorPlanSvg: SVG da planta baixa gerada pela IA
  // Contém a representação visual do ambiente em formato SVG
  const [floorPlanSvg, setFloorPlanSvg] = useState<string | null>(null);
  
  // risks: Array de riscos identificados e posicionados no mapa
  // Cada risco tem: id, tipo, gravidade, posição (x,y), raio, cor
  const [risks, setRisks] = useState<Risk[]>([]);
  
  // mapId: ID do mapa no banco de dados (gerado após criar mapa)
  // Necessário para salvar riscos e posições
  const [mapId, setMapId] = useState<number | null>(existingMapId);
  
  // isLoading: Indica se está gerando mapa ou exportando PDF
  const [isLoading, setIsLoading] = useState(false);
  
  // showRiskForm: Controla visibilidade do formulário de adicionar risco
  const [showRiskForm, setShowRiskForm] = useState(false);
  
  // mapDimensions: Dimensões da planta (largura e altura em pixels)
  const [mapDimensions, setMapDimensions] = useState({ width: 1000, height: 800 });
  
  // isSaving: Indica se está salvando posições de riscos
  const [isSaving, setIsSaving] = useState(false);
  
  // ============================================================================
  // REFS (useRef)
  // ============================================================================
  
  // canvasRef: Referência ao elemento DOM do canvas para capturar em PDF
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // pendingSavesRef: Rastreia quais riscos estão aguardando salvamento
  // Evita múltiplas requisições para o mesmo risco
  const pendingSavesRef = useRef<Set<number>>(new Set());
  
  // ============================================================================
  // QUERIES E MUTATIONS (tRPC - Comunicação com API)
  // ============================================================================
  
  // QUERY: Carrega mapa existente se mapId foi fornecido na URL
  // Retorna: { map: { id, title, description, floorPlanSvg, width, height }, risks: [] }
  const { data: existingMap } = trpc.riskMaps.get.useQuery(
    { mapId: existingMapId! },
    { enabled: !!existingMapId } // Só executa se existingMapId existe
  );
  
  // MUTATION: Gera planta baixa em SVG usando IA
  // Input: { description: string }
  // Output: { svg: string, width: number, height: number }
  // Onde ocorre: server/routers.ts → ai.generateFloorPlan → server/helpers/llmHelpers.ts
  const generateFloorPlanMutation = trpc.ai.generateFloorPlan.useMutation();
  
  // MUTATION: Identifica riscos ocupacionais usando IA
  // Input: { description: string }
  // Output: Array de { type, severity, label, description }
  // Onde ocorre: server/routers.ts → ai.identifyRisks → server/helpers/llmHelpers.ts
  const identifyRisksMutation = trpc.ai.identifyRisks.useMutation();
  
  // MUTATION: Cria novo mapa no banco de dados
  // Input: { title, description, floorPlanSvg, width, height }
  // Output: { insertId: number } (ID do mapa criado)
  // Onde ocorre: server/routers.ts → riskMaps.create → server/db.ts
  const createMapMutation = trpc.riskMaps.create.useMutation();
  
  // MUTATION: Adiciona novo risco ao mapa
  // Input: { mapId, type, severity, label, description, xPosition, yPosition, radius, color }
  // Output: { insertId: number } (ID do risco criado)
  // Onde ocorre: server/routers.ts → risks.add → server/db.ts
  const addRiskMutation = trpc.risks.add.useMutation();
  
  // MUTATION: Deleta risco do mapa
  // Input: { riskId: number }
  // Onde ocorre: server/routers.ts → risks.delete → server/db.ts
  const deleteRiskMutation = trpc.risks.delete.useMutation();
  
  // MUTATION: Atualiza posição de um risco (x, y)
  // Input: { riskId, xPosition, yPosition }
  // Onde ocorre: server/routers.ts → risks.updatePosition → server/db.ts
  const updatePositionMutation = trpc.risks.updatePosition.useMutation();
  
  // ============================================================================
  // EFFECTS (useEffect)
  // ============================================================================
  
  // Effect 1: Carrega mapa existente quando componente monta
  // Se URL contém mapId, busca dados do mapa e carrega no estado
  useEffect(() => {
    if (existingMap) {
      const mapData = existingMap.map || existingMap;
      setDescription(mapData.description || "");
      setFloorPlanSvg(mapData.floorPlanSvg);
      setMapDimensions({
        width: mapData.width,
        height: mapData.height,
      });
      
      if (existingMap.risks) {
        setRisks(existingMap.risks as Risk[]);
      }
    }
  }, [existingMap]);
  
  // Effect 2: Limpa timeouts pendentes ao desmontar componente
  // Evita memory leaks de debounce
  useEffect(() => {
    return () => {
      pendingSavesRef.current.clear();
    };
  }, []);

  // ============================================================================
  // FUNÇÕES DE NEGÓCIO
  // ============================================================================

  /**
   * Salva posição de um risco no banco de dados
   * Chamada após debounce de 1 segundo (veja debouncedSavePosition)
   */
  const saveRiskPosition = async (riskId: number, x: number, y: number) => {
    if (!mapId || mapId === 0) return;
    
    try {
      setIsSaving(true);
      // Chamada à API via tRPC
      // Comunicação: Frontend → tRPC Client → Backend → Database
      await updatePositionMutation.mutateAsync({
        riskId,
        xPosition: x,
        yPosition: y,
      });
      pendingSavesRef.current.delete(riskId);
    } catch (error) {
      console.error("Erro ao salvar posição:", error);
      toast.error("Erro ao salvar posição do risco");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Hook customizado useDebounce: Aguarda 1 segundo após o último movimento
   * antes de chamar saveRiskPosition
   * 
   * Benefício: Evita múltiplas requisições ao banco enquanto usuário está
   * arrastando o risco. Só salva quando usuário para de mover.
   * 
   * Implementação: client/src/hooks/useDebounce.ts
   */
  const debouncedSavePosition = useDebounce(
    (riskId: number, x: number, y: number) => {
      saveRiskPosition(riskId, x, y);
    },
    1000
  );

  /**
   * Gera posições distribuídas para riscos evitar sobreposição
   * Usa grid com variação aleatória para melhor distribuição visual
   */
  const generateDistributedPosition = (index: number, total: number) => {
    const padding = 100;
    const availableWidth = mapDimensions.width - padding * 2;
    const availableHeight = mapDimensions.height - padding * 2;

    // Criar grid de posições
    const cols = Math.ceil(Math.sqrt(total));
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / Math.ceil(total / cols);

    const col = index % cols;
    const row = Math.floor(index / cols);

    const x = padding + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 40;
    const y = padding + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 40;

    return {
      xPosition: Math.max(50, Math.min(mapDimensions.width - 50, x)),
      yPosition: Math.max(50, Math.min(mapDimensions.height - 50, y)),
    };
  };

  /**
   * FLUXO PRINCIPAL: Gera mapa de risco completo
   * 
   * Passos:
   * 1. Valida descrição do ambiente
   * 2. Chama IA para gerar planta SVG (generateFloorPlanMutation)
   * 3. Chama IA para identificar riscos (identifyRisksMutation)
   * 4. Cria mapa no banco de dados (createMapMutation)
   * 5. Adiciona cada risco identificado ao banco (addRiskMutation)
   * 6. Atualiza estado local com dados salvos
   * 
   * Comunicação com Backend:
   * - generateFloorPlanMutation: Chama server/routers.ts → ai.generateFloorPlan
   *   Que por sua vez chama server/helpers/llmHelpers.ts → generateFloorPlanSVG
   *   Usa LLM (Claude/GPT) para gerar SVG a partir de descrição
   * 
   * - identifyRisksMutation: Chama server/routers.ts → ai.identifyRisks
   *   Que por sua vez chama server/helpers/llmHelpers.ts → identifyOccupationalRisks
   *   Usa LLM para extrair riscos do texto em formato JSON estruturado
   * 
   * - createMapMutation: Chama server/routers.ts → riskMaps.create
   *   Que por sua vez chama server/db.ts → createRiskMap
   *   Insere registro na tabela risk_maps do MySQL
   * 
   * - addRiskMutation: Chama server/routers.ts → risks.add
   *   Que por sua vez chama server/db.ts → addRisk
   *   Insere registro na tabela risks do MySQL
   */
  const handleGenerateMap = async () => {
    if (!description.trim()) {
      toast.error("Por favor, descreva o ambiente de trabalho");
      return;
    }

    setIsLoading(true);
    try {
      // PASSO 1: Gerar planta baixa com IA
      // Comunicação: Frontend → tRPC → Backend → LLM → SVG
      const floorPlanResponse = await generateFloorPlanMutation.mutateAsync({
        description,
      });
      setFloorPlanSvg(floorPlanResponse.svg);
      setMapDimensions({
        width: floorPlanResponse.width,
        height: floorPlanResponse.height,
      });

      // PASSO 2: Identificar riscos com IA
      // Comunicação: Frontend → tRPC → Backend → LLM → Array de riscos
      const identifiedRisks = await identifyRisksMutation.mutateAsync({
        description,
      });

      // PASSO 3: Criar mapa no banco de dados
      // Comunicação: Frontend → tRPC → Backend → MySQL
      const mapResult = await createMapMutation.mutateAsync({
        title: `Mapa de Risco - ${new Date().toLocaleDateString()}`,
        description,
        floorPlanSvg: floorPlanResponse.svg,
        width: floorPlanResponse.width,
        height: floorPlanResponse.height,
      });

      const newMapId = mapResult.insertId as number;
      setMapId(newMapId);
      console.log("Map created with ID:", newMapId);

      // PASSO 4: Adicionar cada risco identificado ao banco
      // Comunicação: Frontend → tRPC → Backend → MySQL (múltiplas inserções)
      const newRisks: Risk[] = [];
      for (let i = 0; i < identifiedRisks.length; i++) {
        const risk = identifiedRisks[i];
        const position = generateDistributedPosition(i, identifiedRisks.length);

        const riskData = {
          mapId: newMapId,
          type: risk.type,
          severity: risk.severity,
          label: risk.label,
          description: risk.description,
          xPosition: position.xPosition,
          yPosition: position.yPosition,
          radius: getSeverityRadius(risk.severity),
          color: getRiskColor(risk.type),
        };

        const riskResult = await addRiskMutation.mutateAsync(riskData);
        newRisks.push({
          id: riskResult.insertId as number,
          ...riskData,
        });
      }

      // PASSO 5: Atualizar estado local
      setRisks(newRisks);
      toast.success("Mapa de risco gerado com sucesso!");
    } catch (error) {
      console.error("Error generating map:", error);
      toast.error("Erro ao gerar mapa de risco");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Adiciona novo risco manualmente
   * 
   * Comunicação com Backend:
   * - addRiskMutation: Chama server/routers.ts → risks.add
   *   Que por sua vez chama server/db.ts → addRisk
   *   Insere registro na tabela risks do MySQL
   */
  const handleAddRisk = async (riskData: Omit<Risk, "id">) => {
    if (!mapId || mapId === 0) {
      console.error("MapId is invalid:", mapId);
      toast.error("Mapa não foi criado. Por favor, gere um mapa primeiro.");
      return;
    }

    try {
      // Chamada à API via tRPC
      const result = await addRiskMutation.mutateAsync({
        ...riskData,
        mapId,
      });

      const newRisk: Risk = {
        id: result.insertId as number,
        ...riskData,
      };

      // Atualiza estado local imediatamente para feedback visual
      setRisks((prevRisks) => [...prevRisks, newRisk]);
      setShowRiskForm(false);
      toast.success("Risco adicionado com sucesso!");
    } catch (error) {
      console.error("Error adding risk:", error);
      toast.error("Erro ao adicionar risco");
    }
  };

  /**
   * Deleta risco do mapa
   * 
   * Comunicação com Backend:
   * - deleteRiskMutation: Chama server/routers.ts → risks.delete
   *   Que por sua vez chama server/db.ts → deleteRisk
   *   Deleta registro da tabela risks do MySQL
   */
  const handleDeleteRisk = async (riskId: number) => {
    try {
      // Chamada à API via tRPC
      await deleteRiskMutation.mutateAsync({ riskId });
      
      // Atualiza estado local removendo risco
      setRisks((prevRisks) => prevRisks.filter((r) => r.id !== riskId));
      toast.success("Risco removido com sucesso!");
    } catch (error) {
      console.error("Error deleting risk:", error);
      toast.error("Erro ao remover risco");
    }
  };

  /**
   * Atualiza posição de um risco (drag-and-drop)
   * 
   * Fluxo:
   * 1. Atualiza estado local imediatamente (feedback visual)
   * 2. Marca risco como pendente de salvamento
   * 3. Chama debouncedSavePosition (aguarda 1 segundo)
   * 4. Após 1 segundo sem movimento, salva no banco
   * 
   * Benefício: Usuário vê movimento imediato, mas banco é atualizado
   * apenas quando usuário para de mover (evita múltiplas requisições)
   */
  const handleUpdateRiskPosition = (riskId: number, x: number, y: number) => {
    // Atualizar estado local imediatamente para feedback visual
    setRisks((prevRisks) =>
      prevRisks.map((r) =>
        r.id === riskId ? { ...r, xPosition: x, yPosition: y } : r
      )
    );
    
    // Marcar como pendente de salvamento
    pendingSavesRef.current.add(riskId);
    
    // Salvar com debounce (aguarda 1 segundo após último movimento)
    debouncedSavePosition(riskId, x, y);
  };
  
  /**
   * Exporta mapa como PDF
   * 
   * Comunicação com Backend:
   * - Não há comunicação com backend, tudo é feito no frontend
   * - Usa html2canvas para capturar elemento DOM como imagem
   * - Usa jsPDF para gerar PDF com imagem + legenda
   * 
   * Implementação: client/src/utils/pdfExport.ts
   */
  const handleExportPDF = async () => {
    if (!floorPlanSvg || !mapId) {
      toast.error("Gere um mapa antes de exportar");
      return;
    }
    
    try {
      setIsLoading(true);
      const timestamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const filename = `mapa-risco-${mapId}-${timestamp}.pdf`;
      
      // Captura elemento do DOM e gera PDF
      await exportMapToPDF('map-canvas-container', {
        title: `Mapa de Risco Ocupacional - ID ${mapId}`,
        description: description || 'Sem descrição',
        createdAt: new Date(),
        risks,
      }, filename);
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // RENDERIZAÇÃO (JSX)
  // ============================================================================

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Banner de salvamento automático */}
      {isSaving && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 text-sm text-blue-700 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Salvando posições...
        </div>
      )}
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-light text-foreground mb-2">
                Mapa de Risco Ocupacional
              </h1>
              <p className="text-muted-foreground">
                Gere mapas de risco inteligentes com IA
              </p>
            </div>
            {floorPlanSvg && (
              <div className="flex gap-2">
                <Button
                  onClick={handleExportPDF}
                  disabled={isLoading}
                  className="gap-2"
                  variant="outline"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </Button>
                {mapId && (
                  <Button
                    onClick={() => {
                      const shareLink = `${window.location.origin}/view/${mapId}`;
                      navigator.clipboard.writeText(shareLink).then(() => {
                        alert("Link de compartilhamento copiado!");
                      });
                    }}
                    className="gap-2"
                    variant="outline"
                  >
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seção de Input - Descrição do Ambiente */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                  Descrição do Ambiente
                </h2>

                {/* Input controlado: value={description} onChange={setDescription} */}
                <Textarea
                  placeholder="Descreva o layout do seu ambiente de trabalho, quantidade de empregados, equipamentos, etc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mb-4 h-40 resize-none"
                />

                {/* Botão de geração de mapa */}
                <Button
                  onClick={handleGenerateMap}
                  disabled={isLoading}
                  className="w-full mb-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar Mapa"
                  )}
                </Button>

                {/* Mostrar formulário de adicionar risco apenas se mapa foi gerado */}
                {floorPlanSvg && (
                  <>
                    <Button
                      onClick={() => setShowRiskForm(!showRiskForm)}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Risco
                    </Button>

                    {showRiskForm && (
                      <AddRiskForm
                        onAdd={handleAddRisk}
                        onCancel={() => setShowRiskForm(false)}
                      />
                    )}
                  </>
                )}
              </Card>
            </div>

            {/* Seção de Mapa e Legenda */}
            <div className="lg:col-span-2" id="map-canvas-container">
              {floorPlanSvg ? (
                <div className="space-y-6">
                  {/* Card da Planta Baixa */}
                  <Card className="p-6 bg-card">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">
                      Planta Baixa
                    </h2>
                    <div
                      ref={canvasRef}
                      className="bg-white rounded-lg border border-border overflow-auto"
                    >
                      {/* Componente que renderiza SVG + círculos de risco com drag-and-drop */}
                      <RiskMapCanvas
                        svg={floorPlanSvg}
                        risks={risks}
                        onRiskPositionChange={handleUpdateRiskPosition}
                        onRiskDelete={handleDeleteRisk}
                      />
                    </div>
                  </Card>

                  {/* Card da Legenda - Mostrado apenas se há riscos */}
                  {risks.length > 0 && (
                    <Card className="p-6 bg-card">
                      <h2 className="text-lg font-semibold mb-4 text-foreground">
                        Legenda de Riscos
                      </h2>
                      <RiskLegend risks={risks} onDeleteRisk={handleDeleteRisk} />
                    </Card>
                  )}
                </div>
              ) : (
                /* Placeholder quando mapa não foi gerado */
                <Card className="p-12 text-center bg-card border-2 border-dashed border-border">
                  <p className="text-muted-foreground mb-2">
                    Descreva seu ambiente de trabalho para gerar o mapa
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A IA irá gerar uma planta baixa e identificar riscos
                    automaticamente
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: AddRiskForm - Formulário para adicionar risco manualmente
// ============================================================================

interface AddRiskFormProps {
  onAdd: (risk: Omit<Risk, "id">) => void;
  onCancel: () => void;
}

/**
 * Formulário para adicionar risco manualmente
 * 
 * Usa useState para controlar campos do formulário:
 * - type: Tipo de risco (acidental, químico, ergonômico, físico, biológico)
 * - severity: Gravidade (baixa, média, alta, crítica)
 * - label: Rótulo do risco (ex: "Falta de iluminação")
 * - description: Descrição detalhada
 * 
 * Novo risco aparece no centro do mapa (500, 400)
 */
function AddRiskForm({ onAdd, onCancel }: AddRiskFormProps) {
  // useState: Controla estado do formulário
  const [type, setType] = useState("ergonomic");
  const [severity, setSeverity] = useState("medium");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      toast.error("Digite um rótulo para o risco");
      return;
    }

    // Novo risco aparece no centro do mapa
    const centerX = 500;
    const centerY = 400;

    onAdd({
      type,
      severity,
      label,
      description,
      xPosition: centerX,
      yPosition: centerY,
      radius: getSeverityRadius(severity),
      color: getRiskColor(type),
    });

    // Limpar formulário após adicionar
    setLabel("");
    setDescription("");
    setType("ergonomic");
    setSeverity("medium");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-muted rounded-lg">
      <div className="space-y-3">
        {/* Seletor de tipo de risco */}
        <div>
          <label className="text-sm font-medium text-foreground">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="acidental">Acidental</option>
            <option value="chemical">Químico</option>
            <option value="ergonomic">Ergonômico</option>
            <option value="physical">Físico</option>
            <option value="biological">Biológico</option>
          </select>
        </div>

        {/* Seletor de gravidade */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Gravidade
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>

        {/* Input de rótulo */}
        <div>
          <label className="text-sm font-medium text-foreground">Rótulo</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Falta de iluminação"
            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
        </div>

        {/* Textarea de descrição */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição detalhada do risco"
            className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none h-20"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-3 py-2 bg-accent text-accent-foreground rounded-md font-medium hover:opacity-90"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 bg-muted text-foreground rounded-md font-medium hover:opacity-90"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * Retorna cor hexadecimal baseada no tipo de risco
 * Cores são padronizadas para facilitar identificação visual
 */
function getRiskColor(type: string): string {
  const colors: Record<string, string> = {
    acidental: "#FF6B6B",    // Vermelho
    chemical: "#FFD93D",      // Amarelo
    ergonomic: "#6BCB77",     // Verde
    physical: "#4D96FF",      // Azul
    biological: "#FF6B9D",    // Rosa
  };
  return colors[type] || "#999999";
}

/**
 * Retorna raio do círculo baseado na gravidade
 * Círculos maiores = riscos mais graves
 */
function getSeverityRadius(severity: string): number {
  const radii: Record<string, number> = {
    low: 20,      // Baixa gravidade
    medium: 30,   // Média gravidade
    high: 40,     // Alta gravidade
    critical: 50, // Crítica
  };
  return radii[severity] || 30;
}
