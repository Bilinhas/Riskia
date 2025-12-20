/**
 * ============================================================================
 * COMPONENTE: RiskMapCanvas - Canvas de Visualização de Mapa de Risco
 * ============================================================================
 * 
 * Responsabilidades:
 * 1. Renderizar planta baixa SVG gerada pela IA
 * 2. Renderizar círculos de risco sobrepostos no SVG
 * 3. Implementar drag-and-drop para posicionar riscos
 * 4. Exibir tooltip com rótulo do risco ao passar mouse
 * 5. Permitir deletar risco ao clicar no botão X
 * 
 * Tecnologia:
 * - useRef: Rastrear estado do drag sem re-renders
 * - useState: Controlar estado visual (hover, dragging)
 * - useEffect: Gerenciar event listeners de mouse
 * - useCallback: Otimizar função de mouseDown
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

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
  svg: string;                                           // SVG da planta baixa (HTML string)
  risks: Risk[];                                         // Array de riscos a renderizar
  onRiskPositionChange: (riskId: number, x: number, y: number) => void; // Callback ao mover risco
  onRiskDelete: (riskId: number) => void;               // Callback ao deletar risco
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function RiskMapCanvas({
  svg,
  risks,
  onRiskPositionChange,
  onRiskDelete,
}: RiskMapCanvasProps) {
  // ============================================================================
  // REFS (useRef) - Estado que não causa re-render
  // ============================================================================
  
  // containerRef: Referência ao elemento DOM do container
  // Usado para calcular posição do mouse relativa ao container
  const containerRef = useRef<HTMLDivElement>(null);
  
  /**
   * dragStateRef: Rastreia estado do drag-and-drop
   * 
   * Armazena:
   * - riskId: ID do risco sendo arrastado
   * - startX/startY: Posição inicial do mouse quando começou o drag
   * - riskStartX/riskStartY: Posição inicial do risco quando começou o drag
   * 
   * Benefício: useRef não causa re-renders, apenas armazena dados
   * Alternativa seria useState, mas causaria múltiplos re-renders durante drag
   */
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

  // ============================================================================
  // ESTADO LOCAL (useState) - Causa re-render
  // ============================================================================
  
  // draggingRiskId: ID do risco sendo arrastado (null se nenhum)
  // Usado para mudar cursor e z-index durante drag
  const [draggingRiskId, setDraggingRiskId] = useState<number | null>(null);
  
  // dragStartPos: Posição inicial do mouse (não usado mais, mantido para compatibilidade)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  // hoveredRiskId: ID do risco sob o mouse
  // Usado para mostrar tooltip e botão de delete
  const [hoveredRiskId, setHoveredRiskId] = useState<number | null>(null);

  // ============================================================================
  // FUNÇÕES DE DRAG-AND-DROP
  // ============================================================================

  /**
   * handleMouseDown: Inicia o drag de um risco
   * 
   * Fluxo:
   * 1. Previne comportamento padrão do mouse
   * 2. Encontra risco clicado no array
   * 3. Armazena posição inicial do mouse e risco em dragStateRef
   * 4. Marca risco como sendo arrastado
   * 
   * useCallback: Otimiza performance evitando recriação da função
   * Dependências: [risks] - recria se array de riscos mudar
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, riskId: number) => {
      e.preventDefault();
      e.stopPropagation();

      // Encontrar risco no array
      const risk = risks.find((r) => r.id === riskId);
      if (!risk) return;

      // Obter dimensões do container para cálculos posteriores
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Armazenar estado do drag em useRef
      // Isso permite rastrear movimento sem re-renders
      dragStateRef.current = {
        riskId,
        startX: e.clientX,           // Posição X do mouse quando clicou
        startY: e.clientY,           // Posição Y do mouse quando clicou
        riskStartX: risk.xPosition,  // Posição X do risco quando clicou
        riskStartY: risk.yPosition,  // Posição Y do risco quando clicou
      };

      // Atualizar estado para mudar cursor e z-index
      setDraggingRiskId(riskId);
      setDragStartPos({ x: e.clientX, y: e.clientY });
    },
    [risks]
  );

  /**
   * useEffect: Gerencia event listeners de mousemove e mouseup
   * 
   * Fluxo:
   * 1. Quando draggingRiskId muda, adiciona listeners ao document
   * 2. handleMouseMove: Calcula novo movimento e chama callback
   * 3. handleMouseUp: Remove listeners quando mouse é solto
   * 4. Cleanup: Remove listeners ao desmontar ou mudar dependências
   * 
   * Benefício: Event listeners no document permitem drag fora do container
   * Sem isso, seria impossível arrastar rápido para fora da área
   */
  useEffect(() => {
    // Se nenhum risco está sendo arrastado, não fazer nada
    if (draggingRiskId === null) return;

    /**
     * handleMouseMove: Atualiza posição do risco durante o drag
     * 
     * Cálculo:
     * 1. deltaX = posição atual do mouse - posição inicial do mouse
     * 2. newX = posição inicial do risco + deltaX
     * 3. Limita dentro dos limites do container
     * 4. Chama callback com nova posição
     */
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (state.riskId === null) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calcular diferença de movimento (delta)
      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;

      // Calcular nova posição baseada na posição inicial do risco
      let newX = state.riskStartX + deltaX;
      let newY = state.riskStartY + deltaY;

      // Limitar dentro dos limites do container
      // Evita que risco saia da área visível
      newX = Math.max(0, Math.min(newX, rect.width));
      newY = Math.max(0, Math.min(newY, rect.height));

      // Chamar callback com nova posição
      // Callback atualiza estado local em RiskMapEditor
      // E marca para salvamento com debounce
      onRiskPositionChange(state.riskId, newX, newY);
    };

    /**
     * handleMouseUp: Finaliza o drag
     * 
     * Limpa estado do drag e remove listeners
     */
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

    // Adicionar listeners ao document (não ao container)
    // Permite drag fora da área visível
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Cleanup: Remover listeners ao desmontar ou mudar dependências
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingRiskId, onRiskPositionChange]);

  // ============================================================================
  // RENDERIZAÇÃO (JSX)
  // ============================================================================

  return (
    <div
      ref={containerRef}
      className="relative w-full h-96 bg-white rounded-lg overflow-hidden"
    >
      {/* ======================================================================
          PLANTA BAIXA SVG
          ====================================================================== */}
      
      {/* 
        Renderiza SVG da planta baixa gerada pela IA
        
        dangerouslySetInnerHTML: Insere HTML bruto (SVG neste caso)
        Necessário porque SVG é string gerada pela IA
        
        pointerEvents: none: Permite que cliques passem através do SVG
        para os círculos de risco abaixo
      */}
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        className="w-full h-full"
        style={{ pointerEvents: "none" }}
      />

      {/* ======================================================================
          CÍRCULOS DE RISCO COM DRAG-AND-DROP
          ====================================================================== */}
      
      {/* 
        Container absoluto que sobrepõe o SVG
        pointer-events-none: Desativa cliques no container
        pointer-events-auto nos filhos: Reativa cliques nos círculos
      */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Renderizar cada risco como círculo posicionado */}
        {risks.map((risk, index) => (
          <div
            key={`risk-${risk.id}-${index}`}
            className="absolute pointer-events-auto group"
            style={{
              // Posicionar círculo no mapa
              left: `${risk.xPosition}px`,
              top: `${risk.yPosition}px`,
              
              // Centralizar círculo na posição (translate -50%)
              transform: "translate(-50%, -50%)",
              
              // Mudar cursor durante drag
              cursor: draggingRiskId === risk.id ? "grabbing" : "grab",
              
              // Evitar seleção de texto durante drag
              userSelect: "none",
              
              // Aumentar z-index durante drag para aparecer acima de outros
              zIndex: draggingRiskId === risk.id ? 50 : 10,
            }}
            
            // Event handlers
            onMouseDown={(e) => handleMouseDown(e, risk.id)}
            onMouseEnter={() => setHoveredRiskId(risk.id)}
            onMouseLeave={() => setHoveredRiskId(null)}
          >
            {/* ================================================================
                CÍRCULO DE RISCO
                ================================================================ */}
            
            {/* 
              Círculo colorido representando o risco
              
              Tamanho: radius * 2 (diâmetro)
              Cor: Baseada no tipo de risco
              Opacidade: 0.7 normal, 0.9 durante drag
              Sombra: Efeito visual com cor do risco
            */}
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

            {/* ================================================================
                BOTÃO DE DELETE (Aparece ao passar mouse)
                ================================================================ */}
            
            {/* 
              Botão X aparece apenas quando risco está em hover
              Posicionado no canto superior direito do círculo
            */}
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

            {/* ================================================================
                TOOLTIP COM RÓTULO DO RISCO
                ================================================================ */}
            
            {/* 
              Tooltip aparece acima do círculo quando em hover
              Mostra o rótulo do risco (ex: "Falta de iluminação")
            */}
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
