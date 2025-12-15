import { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

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

interface RiskMapCanvasProps {
  svg: string;
  risks: Risk[];
  onRiskPositionChange: (riskId: number, x: number, y: number) => void;
  onRiskDelete: (riskId: number) => void;
}

export default function RiskMapCanvas({
  svg,
  risks,
  onRiskPositionChange,
  onRiskDelete,
}: RiskMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingRiskId, setDraggingRiskId] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hoveredRiskId, setHoveredRiskId] = useState<number | null>(null);
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, riskId: number) => {
      e.preventDefault();
      e.stopPropagation();

      const risk = risks.find((r) => r.id === riskId);
      if (!risk) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Armazenar estado do drag
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
    [risks]
  );

  useEffect(() => {
    if (draggingRiskId === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (state.riskId === null) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calcular diferença de movimento
      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;

      // Calcular nova posição baseada na posição inicial do risco
      let newX = state.riskStartX + deltaX;
      let newY = state.riskStartY + deltaY;

      // Limitar dentro dos limites do container
      newX = Math.max(0, Math.min(newX, rect.width));
      newY = Math.max(0, Math.min(newY, rect.height));

      // Chamar callback apenas para o risco que está sendo arrastado
      onRiskPositionChange(state.riskId, newX, newY);
    };

    const handleMouseUp = () => {
      dragStateRef.current = {
        riskId: null,
        startX: 0,
        startY: 0,
        riskStartX: 0,
        riskStartY: 0,
      };
      setDraggingRiskId(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingRiskId, onRiskPositionChange]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-96 bg-white rounded-lg overflow-hidden"
    >
      {/* SVG Floor Plan */}
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        className="w-full h-full"
        style={{ pointerEvents: "none" }}
      />

      {/* Risk Markers */}
      <div className="absolute inset-0 pointer-events-none">
        {risks.map((risk, index) => (
          <div
            key={`risk-${risk.id}-${index}`}
            className="absolute pointer-events-auto group"
            style={{
              left: `${risk.xPosition}px`,
              top: `${risk.yPosition}px`,
              transform: "translate(-50%, -50%)",
              cursor: draggingRiskId === risk.id ? "grabbing" : "grab",
              userSelect: "none",
              zIndex: draggingRiskId === risk.id ? 50 : 10,
            }}
            onMouseDown={(e) => handleMouseDown(e, risk.id)}
            onMouseEnter={() => setHoveredRiskId(risk.id)}
            onMouseLeave={() => setHoveredRiskId(null)}
          >
            {/* Risk Circle */}
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

            {/* Delete Button (visible on hover) */}
            {hoveredRiskId === risk.id && (
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

            {/* Tooltip */}
            {hoveredRiskId === risk.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-foreground text-background px-3 py-2 rounded-md text-xs whitespace-nowrap pointer-events-none z-10">
                {risk.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
