/**
 * ============================================================================
 * ARQUIVO: client/src/lib/trpc.ts - Cliente tRPC
 * ============================================================================
 * 
 * Este arquivo configura o cliente tRPC para comunicação com o backend.
 * 
 * tRPC é um framework que permite:
 * - Comunicação type-safe entre frontend e backend
 * - Autocomplete automático de procedures
 * - Type-checking em tempo de compilação
 * - Sem necessidade de escrever tipos manualmente
 * 
 * Uso no Frontend:
 * 
 * QUERY (dados que não mudam frequentemente):
 * const { data, isLoading } = trpc.riskMaps.list.useQuery();
 * 
 * MUTATION (operações que modificam dados):
 * const mutation = trpc.riskMaps.create.useMutation();
 * await mutation.mutateAsync({ title, description, ... });
 * 
 * Fluxo de Comunicação:
 * Frontend (trpc.*.useQuery/useMutation) 
 *   → tRPC Client (este arquivo)
 *   → HTTP POST para /api/trpc
 *   → Backend (server/routers.ts)
 *   → Database (MySQL)
 */

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

/**
 * trpc: Cliente tRPC configurado com tipos do AppRouter
 * 
 * AppRouter é importado de server/routers.ts e contém TODAS as procedures
 * Isso permite que o TypeScript infira tipos automaticamente
 * 
 * Exemplo de uso:
 * 
 * // QUERY - Carregar lista de mapas
 * const { data: maps } = trpc.riskMaps.list.useQuery();
 * 
 * // MUTATION - Criar novo mapa
 * const createMap = trpc.riskMaps.create.useMutation();
 * const result = await createMap.mutateAsync({
 *   title: "Meu Mapa",
 *   description: "Descrição...",
 *   floorPlanSvg: "<svg>...</svg>",
 *   width: 1000,
 *   height: 800
 * });
 * 
 * // MUTATION - Deletar mapa
 * const deleteMap = trpc.riskMaps.delete.useMutation();
 * await deleteMap.mutateAsync({ mapId: 123 });
 * 
 * // MUTATION - Adicionar risco
 * const addRisk = trpc.risks.add.useMutation();
 * const result = await addRisk.mutateAsync({
 *   mapId: 123,
 *   type: "ergonomic",
 *   severity: "high",
 *   label: "Postura inadequada",
 *   description: "...",
 *   xPosition: 500,
 *   yPosition: 400,
 *   radius: 30,
 *   color: "#6BCB77"
 * });
 * 
 * // MUTATION - Atualizar posição de risco (com debounce)
 * const updatePosition = trpc.risks.updatePosition.useMutation();
 * await updatePosition.mutateAsync({
 *   riskId: 456,
 *   xPosition: 600,
 *   yPosition: 450
 * });
 * 
 * // MUTATION - IA: Gerar planta baixa
 * const generateFloorPlan = trpc.ai.generateFloorPlan.useMutation();
 * const result = await generateFloorPlan.mutateAsync({
 *   description: "Escritório com 10 funcionários..."
 * });
 * // Retorna: { svg: "<svg>...</svg>", width: 1000, height: 800 }
 * 
 * // MUTATION - IA: Identificar riscos
 * const identifyRisks = trpc.ai.identifyRisks.useMutation();
 * const risks = await identifyRisks.mutateAsync({
 *   description: "Escritório com 10 funcionários..."
 * });
 * // Retorna: [{ type: "ergonomic", severity: "high", ... }, ...]
 */
export const trpc = createTRPCReact<AppRouter>();
