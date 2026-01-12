import { useParams, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, ArrowLeft, Loader2 } from "lucide-react";
import RiskMapCanvas from "@/components/RiskMapCanvas";
import RiskLegend from "@/components/RiskLegend";
import { trpc } from "@/lib/trpc";
import { exportMapToPDF } from "@/utils/pdfExport";
import Header from "@/components/Header";

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

interface MapData {
  id: number;
  title: string;
  description: string;
  floorPlanSvg: string;
  createdAt: Date;
  updatedAt: Date;
  risks: Risk[];
}

/**
 * Página de visualização read-only de mapas
 * 
 * Permite visualizar mapas compartilhados sem permissão de edição
 * Oferece opções para exportar PDF e copiar link
 */
export default function ViewMap() {
  const { mapId } = useParams<{ mapId: string }>();
  const [, navigate] = useLocation();

  // Usar hook useQuery do tRPC para buscar dados
  const { data, isLoading, error } = trpc.riskMaps.get.useQuery(
    { mapId: parseInt(mapId || "0") },
    { enabled: !!mapId }
  );

  /**
   * Copiar link de compartilhamento para clipboard
   */
  const handleCopyLink = () => {
    const shareLink = `${window.location.origin}/view/${mapId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      alert("Link de compartilhamento copiado para a área de transferência!");
    }).catch(() => {
      alert("Erro ao copiar link");
    });
  };

  /**
   * Exportar mapa como PDF
   */
  const handleExportPDF = async () => {
    if (!data?.map) return;

    try {
      // Criar elemento temporário com o mapa para captura
      const tempContainer = document.createElement("div");
      tempContainer.id = "temp-map-export";
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.backgroundColor = "#ffffff";
      tempContainer.style.padding = "20px";

      // Adicionar SVG do mapa
      const mapCanvas = document.createElement("div");
      mapCanvas.className = "bg-white rounded-lg border border-border overflow-auto";
      mapCanvas.innerHTML = data.map.floorPlanSvg;

      tempContainer.appendChild(mapCanvas);
      document.body.appendChild(tempContainer);

      // Exportar PDF
      await exportMapToPDF("temp-map-export", {
        title: data.map.title,
        description: data.map.description,
        createdAt: data.map.createdAt,
        risks: data.risks || [],
      });

      // Limpar
      document.body.removeChild(tempContainer);

      alert("PDF exportado com sucesso!");
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      alert("Erro ao exportar PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.map) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <p className="text-destructive">{error?.message || "Mapa não encontrado"}</p>
            <Button onClick={() => navigate("/", { replace: true })} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const mapData = data.map;
  const risks = (data.risks || []) as any[];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header da página */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-light text-foreground mb-2">
              {mapData.title}
            </h1>
            <p className="text-muted-foreground">
              Visualização somente leitura
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Criado em {new Date(mapData.createdAt).toLocaleDateString("pt-BR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Descrição do ambiente */}
        {mapData.description && (
          <Card className="p-6 mb-6 bg-card">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Descrição do Ambiente
            </h2>
            <p className="text-foreground whitespace-pre-wrap">
              {mapData.description}
            </p>
          </Card>
        )}

        {/* Planta Baixa */}
        <Card className="p-6 mb-6 bg-card">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Planta Baixa
          </h2>
          <div className="bg-white rounded-lg border border-border overflow-auto">
            <RiskMapCanvas
              svg={mapData.floorPlanSvg}
              risks={risks}
              onRiskPositionChange={() => {}}
              onRiskDelete={() => {}}
              isReadOnly={true}
            />
          </div>
        </Card>

        {/* Legenda de Riscos */}
        {risks.length > 0 && (
          <Card className="p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Legenda de Riscos
            </h2>
            <RiskLegend
              risks={risks}
              onDeleteRisk={() => {}}
              isReadOnly={true}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
