/*
 * ============================================================================
 * COMPONENTE: RiskMapCanvas - Canvas de Visualização de Mapa de Risco
 * ============================================================================
 * 
 * Responsabilidades:
 * 1. Renderizar planta baixa SVG gerada pela IA
 * 2. Renderizar círculos de risco sobrepostos no SVG
 * 3. Implementar drag-and-drop para posicionar riscos
 * 4. Implementar zoom e pan para navegação
 * 5. Exibir tooltip com rótulo do risco ao passar mouse
 * 6. Permitir deletar risco ao clicar no botão X
 * 
 * Tecnologia:
 * - useRef: Rastrear estado do drag e zoom sem re-renders
 * - useState: Controlar estado visual (hover, dragging, zoom, pan)
 * - useEffect: Gerenciar event listeners de mouse
 * - useCallback: Otimizar funções de mouse
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface RiskMapCanvasProps {
  svg: string;                                           // SVG da planta baixa (HTML string)
  risks: Risk[];                                         // Array de riscos a renderizar
  onRiskPositionChange: (riskId: number, x: number, y: number) => void; // Callback ao mover risco
  onRiskDelete: (riskId: number) => void;               // Callback ao deletar risco
  isReadOnly?: boolean;                                  // Modo somente leitura (sem drag-and-drop)
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function RiskMapCanvas({
  svg,
  risks,
  onRiskPositionChange,
  onRiskDelete,
  isReadOnly = false,
}: RiskMapCanvasProps) {
  // ============================================================================
  // REFS (useRef) - Estado que não causa re-render
  // ============================================================================
  
  // containerRef: Referência ao elemento DOM do container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // svgContainerRef: Referência ao container do SVG para aplicar transformações
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // dragStateRef: Rastreia estado do drag-and-drop
  const dragStateRef = useRef<{
    riskId: number | null;
    startX: number;
    startY: number;
    riskStartX: number;
    riskStartY: number;
  }>({
    riskId: null,
    startX: 0,
    startY: 0,
    riskStartX: 0,
    riskStartY: 0,
  });

  // panStateRef: Rastreia estado do pan (movimento do mapa)
  const panStateRef = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // ============================================================================
  // ESTADO LOCAL (useState) - Causa re-render
  // ============================================================================
  
  // draggingRiskId: ID do risco sendo arrastado (null se nenhum)
  const [draggingRiskId, setDraggingRiskId] = useState<number | null>(null);
  
  // dragStartPos: Posição inicial do mouse
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  // hoveredRiskId: ID do risco sob o mouse
  const [hoveredRiskId, setHoveredRiskId] = useState<number | null>(null);

  // zoom: Nível de zoom (1 = 100%, 2 = 200%, etc)
  const [zoom, setZoom] = useState(1);

  // pan: Deslocamento do mapa em pixels
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // ============================================================================
  // FUNÇÕES DE ZOOM
  // ============================================================================

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ============================================================================
  // FUNÇÕES DE DRAG-AND-DROP DE RISCOS
  // ============================================================================

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, riskId: number) => {
      if (isReadOnly) return;
      e.preventDefault();
      e.stopPropagation();

      const risk = risks.find((r) => r.id === riskId);
      if (!risk) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragStateRef.current = {
        riskId,
        startX: e.clientX,
        startY: e.clientY,
        riskStartX: risk.xPosition,
        riskStartY: risk.yPosition,
      };

      setDraggingRiskId(riskId);
      setDragStartPos({ x: e.clientX, y: e.clientY });
    },
    [risks, isReadOnly]
  );

  // ============================================================================
  // FUNÇÕES DE PAN (MOVIMENTO DO MAPA)
  // ============================================================================

  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Só fazer pan se não estiver arrastando um risco e não estiver em read-only
      if (draggingRiskId !== null || isReadOnly) return;
      
      // Ignorar se clicou em um risco
      const target = e.target as HTMLElement;
      if (target.closest('[data-risk-circle]')) return;

      e.preventDefault();
      e.stopPropagation();

      panStateRef.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
    },
    [draggingRiskId, isReadOnly, pan]
  );

  // ============================================================================
  // EFEITO: Gerencia event listeners de mousemove e mouseup
  // ============================================================================

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Drag de risco
      const dragState = dragStateRef.current;
      if (dragState.riskId !== null) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        const newX = dragState.riskStartX + deltaX / zoom;
        const newY = dragState.riskStartY + deltaY / zoom;

        onRiskPositionChange(dragState.riskId, newX, newY);
      }

      // Pan do mapa
      const panState = panStateRef.current;
      if (panState.isPanning) {
        const deltaX = e.clientX - panState.startX;
        const deltaY = e.clientY - panState.startY;

        setPan({
          x: panState.startPanX + deltaX,
          y: panState.startPanY + deltaY,
        });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current = {
        riskId: null,
        startX: 0,
        startY: 0,
        riskStartX: 0,
        riskStartY: 0,
      };
      panStateRef.current.isPanning = false;
      setDraggingRiskId(null);
    };

    const handleWheel = (e: WheelEvent) => {
      // Só fazer zoom se o mouse está sobre o container
      if (!containerRef.current?.contains(e.target as Node)) return;

      e.preventDefault();
      
      // Zoom com scroll do mouse
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    containerRef.current?.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      containerRef.current?.removeEventListener("wheel", handleWheel);
    };
  }, [onRiskPositionChange, zoom]);

  // ============================================================================
  // RENDERIZAÇÃO (JSX)
  // ============================================================================

  return (
    <div className="relative w-full bg-white rounded-lg overflow-hidden border border-border">
      {/* Controles de zoom */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <Button
          onClick={handleZoomIn}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          title="Aumentar zoom (Scroll do mouse)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          onClick={handleZoomOut}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          title="Diminuir zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          onClick={handleResetZoom}
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          title="Resetar zoom e pan"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Indicador de zoom */}
      <div className="absolute top-4 left-4 bg-background/80 px-3 py-1 rounded text-sm text-foreground z-20">
        {Math.round(zoom * 100)}%
      </div>

      {/* Container principal com scroll */}
      <div
        ref={containerRef}
        className="relative w-full bg-white overflow-auto"
        style={{ minHeight: "600px" }}
        onMouseDown={handleSvgMouseDown}
      >
        {/* Container do SVG com transformações */}
        <div
          ref={svgContainerRef}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "0 0",
            transition: draggingRiskId === null && panStateRef.current.isPanning === false ? "none" : "none",
            cursor: panStateRef.current.isPanning ? "grabbing" : "grab",
            position: "relative",
          }}
        >
          {/* PLANTA BAIXA SVG */}
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            className="w-full"
            style={{
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />

          <style>{`
            [data-riskmap-svg] svg {
              width: 100%;
              height: auto;
              max-width: 100%;
              display: block;
            }
          `}</style>

          {/* CÍRCULOS DE RISCO COM DRAG-AND-DROP - DENTRO DO SVG CONTAINER */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {risks.map((risk, index) => (
              <div
                key={`risk-${risk.id}-${index}`}
                className="absolute pointer-events-auto group"
                data-risk-circle
                style={{
                  left: `${risk.xPosition}px`,
                  top: `${risk.yPosition}px`,
                  transform: "translate(-50%, -50%)",
                  cursor: isReadOnly ? "default" : (draggingRiskId === risk.id ? "grabbing" : "grab"),
                  userSelect: "none",
                  pointerEvents: isReadOnly ? "none" : "auto",
                  zIndex: draggingRiskId === risk.id ? 50 : 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, risk.id)}
                onMouseEnter={() => setHoveredRiskId(risk.id)}
                onMouseLeave={() => setHoveredRiskId(null)}
              >
                {/* CÍRCULO DE RISCO */}
                <div
                  className="rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110"
                  style={{
                    width: `${risk.radius * 2}px`,
                    height: `${risk.radius * 2}px`,
                    backgroundColor: risk.color,
                    opacity: draggingRiskId === risk.id ? 0.9 : 0.7,
                    boxShadow: `0 4px 12px ${risk.color}40`,
                  }}
                />

                {/* BOTÃO DE DELETE */}
                {hoveredRiskId === risk.id && !isReadOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRiskDelete(risk.id);
                    }}
                    className="absolute -top-3 -right-3 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover risco"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* TOOLTIP COM RÓTULO DO RISCO */}
                {hoveredRiskId === risk.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-foreground text-background px-3 py-2 rounded-md text-xs whitespace-nowrap pointer-events-none z-10">
                    {risk.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
