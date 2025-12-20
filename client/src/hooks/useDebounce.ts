/**
 * ============================================================================
 * HOOK: useDebounce - Debounce de Funções
 * ============================================================================
 * 
 * Este hook implementa o padrão "debounce" que aguarda um tempo antes de
 * executar uma função, cancelando execuções anteriores se a função for
 * chamada novamente.
 * 
 * Caso de Uso: Salvamento Automático de Posições
 * 
 * Problema sem debounce:
 * - Usuário arrasta risco de (0,0) para (500,500)
 * - Enquanto arrasta, mousemove dispara ~60 vezes por segundo
 * - Cada movimento chama updatePosition no banco de dados
 * - Resultado: 60 requisições para uma ação do usuário (INEFICIENTE)
 * 
 * Solução com debounce:
 * - Usuário arrasta risco de (0,0) para (500,500)
 * - Cada movimento chama debouncedSavePosition()
 * - Debounce cancela timer anterior e cria novo timer
 * - Após 1 segundo SEM movimento, função é executada
 * - Resultado: 1 requisição para uma ação do usuário (EFICIENTE)
 * 
 * Fluxo no RiskMapEditor:
 * 1. Usuário clica e arrasta círculo
 * 2. handleMouseMove dispara ~60 vezes por segundo
 * 3. onRiskPositionChange atualiza estado local (imediato)
 * 4. debouncedSavePosition aguarda 1 segundo
 * 5. Se usuário continuar movendo, timer é cancelado e reiniciado
 * 6. Quando usuário solta mouse, após 1 segundo, saveRiskPosition é executada
 * 7. Posição é salva no banco de dados
 * 
 * Implementação: Usa useRef para armazenar timeout ID
 * Benefício: Não causa re-renders, apenas armazena ID do timer
 */

import { useEffect, useRef } from 'react';

/**
 * useDebounce: Hook que retorna versão debounced de uma função
 * 
 * Parâmetros:
 * - callback: Função a ser executada após delay
 * - delay: Tempo em milissegundos a aguardar (padrão: 1000ms = 1 segundo)
 * 
 * Retorna: Função debounced que pode ser chamada múltiplas vezes
 * 
 * Exemplo de Uso:
 * 
 * const savePosition = async (riskId, x, y) => {
 *   await updatePositionMutation.mutateAsync({ riskId, xPosition: x, yPosition: y });
 * };
 * 
 * const debouncedSave = useDebounce(savePosition, 1000);
 * 
 * // Chamar múltiplas vezes (ex: durante mousemove)
 * debouncedSave(123, 500, 400);
 * debouncedSave(123, 510, 405);
 * debouncedSave(123, 520, 410);
 * 
 * // Apenas a última chamada será executada após 1 segundo
 * // As anteriores são canceladas
 */
export function useDebounce<Args extends any[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  // timeoutRef: Armazena ID do timeout atual
  // Permite cancelar timeout anterior quando função é chamada novamente
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * useEffect: Cleanup ao desmontar componente
   * 
   * Garante que timeout seja cancelado quando componente é desmontado
   * Evita memory leaks e execução de funções em componentes não montados
   */
  useEffect(() => {
    return () => {
      // Cleanup: Cancelar timeout pendente ao desmontar
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Retorna função debounced que pode ser chamada múltiplas vezes
   * 
   * Fluxo:
   * 1. Se há timeout anterior, cancela (clearTimeout)
   * 2. Cria novo timeout que executará callback após delay
   * 3. Armazena ID do novo timeout em timeoutRef
   * 
   * Resultado: Apenas a última chamada dentro do delay será executada
   */
  return (...args: Args) => {
    // Cancelar timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Criar novo timeout
    timeoutRef.current = setTimeout(() => {
      // Executar callback com argumentos após delay
      callback(...args);
    }, delay);
  };
}
