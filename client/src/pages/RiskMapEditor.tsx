import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RiskMapCanvas from "@/components/RiskMapCanvas";
import RiskLegend from "@/components/RiskLegend";
import Header from "@/components/Header";

interface Risk {
  id: number;
  type: string;
  severity: string;
  label: string;
  description: string;
  xPosition: number;
  yPosition: number;
  radius: number;
  color: string;
}

export default function RiskMapEditor() {
  const [description, setDescription] = useState("");
  const [floorPlanSvg, setFloorPlanSvg] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [mapId, setMapId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [mapDimensions, setMapDimensions] = useState({ width: 1000, height: 800 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const generateFloorPlanMutation = trpc.ai.generateFloorPlan.useMutation();
  const identifyRisksMutation = trpc.ai.identifyRisks.useMutation();
  const createMapMutation = trpc.riskMaps.create.useMutation();
  const addRiskMutation = trpc.risks.add.useMutation();
  const deleteRiskMutation = trpc.risks.delete.useMutation();

  // Função para gerar posições distribuídas para evitar sobreposição
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

  const handleGenerateMap = async () => {
    if (!description.trim()) {
      toast.error("Por favor, descreva o ambiente de trabalho");
      return;
    }

    setIsLoading(true);
    try {
      // Generate floor plan
      const floorPlanResponse = await generateFloorPlanMutation.mutateAsync({
        description,
      });
      setFloorPlanSvg(floorPlanResponse.svg);
      setMapDimensions({
        width: floorPlanResponse.width,
        height: floorPlanResponse.height,
      });

      // Identify risks
      const identifiedRisks = await identifyRisksMutation.mutateAsync({
        description,
      });

      // Create map in database
      const mapResult = await createMapMutation.mutateAsync({
        title: `Mapa de Risco - ${new Date().toLocaleDateString()}`,
        description,
        floorPlanSvg: floorPlanResponse.svg,
        width: floorPlanResponse.width,
        height: floorPlanResponse.height,
      });

      setMapId(mapResult.insertId as number);

      // Add identified risks to the map with distributed positions
      const newRisks: Risk[] = [];
      for (let i = 0; i < identifiedRisks.length; i++) {
        const risk = identifiedRisks[i];
        const position = generateDistributedPosition(i, identifiedRisks.length);

        const riskData = {
          mapId: mapResult.insertId as number,
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

      setRisks(newRisks);
      toast.success("Mapa de risco gerado com sucesso!");
    } catch (error) {
      console.error("Error generating map:", error);
      toast.error("Erro ao gerar mapa de risco");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRisk = async (riskData: Omit<Risk, "id">) => {
    if (!mapId) {
      toast.error("Mapa não foi criado");
      return;
    }

    try {
      const result = await addRiskMutation.mutateAsync({
        ...riskData,
        mapId,
      });

      setRisks([
        ...risks,
        {
          id: result.insertId as number,
          ...riskData,
        },
      ]);

      setShowRiskForm(false);
      toast.success("Risco adicionado com sucesso!");
    } catch (error) {
      console.error("Error adding risk:", error);
      toast.error("Erro ao adicionar risco");
    }
  };

  const handleDeleteRisk = async (riskId: number) => {
    try {
      await deleteRiskMutation.mutateAsync({ riskId });
      setRisks(risks.filter((r) => r.id !== riskId));
      toast.success("Risco removido com sucesso!");
    } catch (error) {
      console.error("Error deleting risk:", error);
      toast.error("Erro ao remover risco");
    }
  };

  const handleUpdateRiskPosition = (riskId: number, x: number, y: number) => {
    setRisks(
      risks.map((r) =>
        r.id === riskId ? { ...r, xPosition: x, yPosition: y } : r
      )
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-light text-foreground mb-2">
              Mapa de Risco Ocupacional
            </h1>
            <p className="text-muted-foreground">
              Gere mapas de risco inteligentes com IA
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Section */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                  Descrição do Ambiente
                </h2>

                <Textarea
                  placeholder="Descreva o layout do seu ambiente de trabalho, quantidade de empregados, equipamentos, etc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mb-4 h-40 resize-none"
                />

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

            {/* Map and Legend Section */}
            <div className="lg:col-span-2">
              {floorPlanSvg ? (
                <div className="space-y-6">
                  <Card className="p-6 bg-card">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">
                      Planta Baixa
                    </h2>
                    <div
                      ref={canvasRef}
                      className="bg-white rounded-lg border border-border overflow-auto"
                    >
                      <RiskMapCanvas
                        svg={floorPlanSvg}
                        risks={risks}
                        onRiskPositionChange={handleUpdateRiskPosition}
                        onRiskDelete={handleDeleteRisk}
                      />
                    </div>
                  </Card>

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

interface AddRiskFormProps {
  onAdd: (risk: Omit<Risk, "id">) => void;
  onCancel: () => void;
}

function AddRiskForm({ onAdd, onCancel }: AddRiskFormProps) {
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

    onAdd({
      type,
      severity,
      label,
      description,
      xPosition: 500,
      yPosition: 400,
      radius: getSeverityRadius(severity),
      color: getRiskColor(type),
    });

    setLabel("");
    setDescription("");
    setType("ergonomic");
    setSeverity("medium");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-muted rounded-lg">
      <div className="space-y-3">
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

function getRiskColor(type: string): string {
  const colors: Record<string, string> = {
    acidental: "#FF6B6B",
    chemical: "#FFD93D",
    ergonomic: "#6BCB77",
    physical: "#4D96FF",
    biological: "#FF6B9D",
  };
  return colors[type] || "#999999";
}

function getSeverityRadius(severity: string): number {
  const radii: Record<string, number> = {
    low: 20,
    medium: 30,
    high: 40,
    critical: 50,
  };
  return radii[severity] || 30;
}
