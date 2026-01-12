/**
 * ============================================================================
 * ARQUIVO: server/routers.ts - Definição de Procedures tRPC
 * ============================================================================
 * 
 * Este arquivo define TODAS as procedures (endpoints) da API tRPC.
 * 
 * tRPC é um framework que permite comunicação type-safe entre frontend e backend.
 * Não há necessidade de escrever rotas REST manualmente - tudo é definido aqui.
 * 
 * Estrutura:
 * - Cada procedure é uma função que pode ser chamada do frontend via trpc.*.useQuery/useMutation
 * - publicProcedure: Sem autenticação
 * - protectedProcedure: Requer autenticação (ctx.user disponível)
 * 
 * Fluxo de Comunicação:
 * Frontend (trpc.*.useMutation) → tRPC Client → Este arquivo → server/db.ts → MySQL
 */

import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { COOKIE_NAME } from "@shared/const";

// ============================================================================
// ROUTER PRINCIPAL
// ============================================================================

export const appRouter = router({
  // ============================================================================
  // SISTEMA (systemRouter)
  // ============================================================================
  system: systemRouter,

  // ============================================================================
  // AUTENTICAÇÃO (auth)
  // ============================================================================
  auth: router({
    /**
     * QUERY: auth.me
     * Retorna dados do usuário autenticado
     * 
     * Comunicação:
     * Frontend: trpc.auth.me.useQuery()
     * Backend: Retorna ctx.user (injetado pelo middleware de autenticação)
     * 
     * Uso: Verificar se usuário está logado e obter dados
     */
    me: publicProcedure.query(opts => opts.ctx.user),

    /**
     * MUTATION: auth.logout
     * Faz logout do usuário limpando cookie de sessão
     * 
     * Comunicação:
     * Frontend: trpc.auth.logout.useMutation()
     * Backend: Limpa cookie COOKIE_NAME
     * 
     * Uso: Logout do usuário
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // MAPAS DE RISCO (riskMaps)
  // ============================================================================
  riskMaps: router({
    /**
     * QUERY: riskMaps.list
     * Lista todos os mapas de risco do usuário autenticado
     * 
     * Comunicação:
     * Frontend: trpc.riskMaps.list.useQuery()
     * Backend: Chama db.getUserRiskMaps(userId)
     * Database: SELECT * FROM risk_maps WHERE user_id = ?
     * 
     * Retorna: Array de { id, title, description, floorPlanSvg, width, height, createdAt }
     * 
     * Uso: Carregar lista de mapas na página Home
     */
    list: protectedProcedure.query(({ ctx }) =>
      db.getUserRiskMaps(ctx.user.id)
    ),

    /**
     * QUERY: riskMaps.get
     * Obtém um mapa específico com todos os seus riscos
     * 
     * Input: { mapId: number }
     * 
     * Comunicação:
     * Frontend: trpc.riskMaps.get.useQuery({ mapId: 123 })
     * Backend: Chama db.getRiskMapWithRisks(mapId, userId)
     * Database: 
     *   SELECT * FROM risk_maps WHERE id = ? AND user_id = ?
     *   SELECT * FROM risks WHERE map_id = ?
     * 
     * Retorna: { map: {...}, risks: [...] }
     * 
     * Uso: Carregar mapa existente para edição (URL: /editor/:mapId)
     */
    get: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "mapId" in val) {
          return { mapId: (val as { mapId: unknown }).mapId as number };
        }
        throw new Error("Invalid input");
      })
      .query(({ ctx, input }) =>
        db.getRiskMapWithRisks(input.mapId, ctx.user.id)
      ),

    /**
     * MUTATION: riskMaps.create
     * Cria novo mapa de risco no banco de dados
     * 
     * Input: { title, description, floorPlanSvg, width, height }
     * 
     * Comunicação:
     * Frontend: trpc.riskMaps.create.useMutation()
     * Backend: Chama db.createRiskMap({...})
     * Database: INSERT INTO risk_maps (user_id, title, description, floorPlanSvg, width, height)
     * 
     * Retorna: { insertId: number } (ID do mapa criado)
     * 
     * Fluxo no Frontend:
     * 1. Usuário digita descrição do ambiente
     * 2. Clica "Gerar Mapa"
     * 3. IA gera planta SVG (generateFloorPlan)
     * 4. IA identifica riscos (identifyRisks)
     * 5. createMapMutation.mutateAsync() cria mapa no BD
     * 6. Retorna mapId para usar em addRisk
     * 
     * Veja: RiskMapEditor.tsx → handleGenerateMap
     */
    create: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null) {
          const obj = val as Record<string, unknown>;
          return {
            title: obj.title as string,
            description: obj.description as string,
            floorPlanSvg: obj.floorPlanSvg as string,
            width: (obj.width as number) || 1000,
            height: (obj.height as number) || 800,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const result = await db.createRiskMap({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          floorPlanSvg: input.floorPlanSvg,
          width: input.width,
          height: input.height,
        });
        // Drizzle ORM retorna resultado com insertId
        const insertId = (result as any)[0]?.insertId || (result as any).insertId;
        if (!insertId) {
          console.error('Drizzle result:', result);
          throw new Error('Failed to create risk map: no insertId returned');
        }
        return { insertId };
      }),

    /**
     * MUTATION: riskMaps.delete
     * Deleta um mapa de risco (e todos seus riscos em cascata)
     * 
     * Input: { mapId: number }
     * 
     * Comunicação:
     * Frontend: trpc.riskMaps.delete.useMutation()
     * Backend: Chama db.deleteRiskMap(mapId)
     * Database: DELETE FROM risk_maps WHERE id = ?
     * 
     * Uso: Deletar mapa da página Home
     * Veja: Home.tsx → handleDeleteMap
     */
    delete: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "mapId" in val) {
          return { mapId: (val as { mapId: unknown }).mapId as number };
        }
        throw new Error("Invalid input");
      })
      .mutation(({ input }) => db.deleteRiskMap(input.mapId)),
  }),

  // ============================================================================
  // RISCOS (risks)
  // ============================================================================
  risks: router({
    /**
     * MUTATION: risks.add
     * Adiciona novo risco a um mapa
     * 
     * Input: { mapId, type, severity, label, description, xPosition, yPosition, radius, color }
     * 
     * Comunicação:
     * Frontend: trpc.risks.add.useMutation()
     * Backend: Chama db.addRisk({...})
     * Database: INSERT INTO risks (map_id, type, severity, label, description, xPosition, yPosition, radius, color)
     * 
     * Retorna: { insertId: number } (ID do risco criado)
     * 
     * Fluxo no Frontend:
     * 1. Usuário clica "Adicionar Risco"
     * 2. Preenche formulário (tipo, gravidade, rótulo, descrição)
     * 3. Clica "Adicionar"
     * 4. addRiskMutation.mutateAsync() adiciona ao BD
     * 5. Novo risco aparece no mapa (no centro)
     * 
     * Veja: RiskMapEditor.tsx → handleAddRisk
     */
    add: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null) {
          const obj = val as Record<string, unknown>;
          return {
            mapId: obj.mapId as number,
            type: obj.type as string,
            severity: obj.severity as string,
            label: obj.label as string,
            description: (obj.description as string | null) || null,
            xPosition: obj.xPosition as number,
            yPosition: obj.yPosition as number,
            radius: (obj.radius as number) || 30,
            color: obj.color as string,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const result = await db.addRisk({
          mapId: input.mapId,
          type: input.type as any,
          severity: input.severity as any,
          label: input.label,
          description: input.description,
          xPosition: input.xPosition,
          yPosition: input.yPosition,
          radius: input.radius,
          color: input.color,
        });
        // Drizzle ORM retorna resultado com insertId
        const insertId = (result as any)[0]?.insertId || (result as any).insertId;
        if (!insertId) {
          console.error('Drizzle result:', result);
          throw new Error('Failed to create risk map: no insertId returned');
        }
        return { insertId };
      }),

    /**
     * MUTATION: risks.updatePosition
     * Atualiza posição (x, y) de um risco
     * 
     * Input: { riskId, xPosition, yPosition }
     * 
     * Comunicação:
     * Frontend: trpc.risks.updatePosition.useMutation()
     * Backend: Chama db.updateRiskPosition(riskId, x, y)
     * Database: UPDATE risks SET xPosition = ?, yPosition = ? WHERE id = ?
     * 
     * Fluxo no Frontend:
     * 1. Usuário arrasta círculo de risco no mapa
     * 2. handleUpdateRiskPosition() atualiza estado local
     * 3. debouncedSavePosition aguarda 1 segundo
     * 4. updatePositionMutation.mutateAsync() salva no BD
     * 
     * Benefício do debounce: Evita múltiplas requisições enquanto usuário está arrastando
     * 
     * Veja: RiskMapEditor.tsx → handleUpdateRiskPosition → debouncedSavePosition
     */
    updatePosition: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null) {
          const obj = val as Record<string, unknown>;
          return {
            riskId: obj.riskId as number,
            xPosition: obj.xPosition as number,
            yPosition: obj.yPosition as number,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(({ input }) =>
        db.updateRiskPosition(input.riskId, input.xPosition, input.yPosition)
      ),

    /**
     * MUTATION: risks.update
     * Atualiza dados de um risco (tipo, gravidade, rótulo, descrição)
     * 
     * Input: { riskId, data: {...} }
     * 
     * Comunicação:
     * Frontend: trpc.risks.update.useMutation()
     * Backend: Chama db.updateRisk(riskId, data)
     * Database: UPDATE risks SET ... WHERE id = ?
     * 
     * Nota: Atualmente não usado no frontend, mas disponível para futuras features
     */
    update: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null) {
          const obj = val as Record<string, unknown>;
          return {
            riskId: obj.riskId as number,
            data: obj.data as Record<string, unknown>,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(({ input }) => db.updateRisk(input.riskId, input.data as any)),

    /**
     * MUTATION: risks.delete
     * Deleta um risco do mapa
     * 
     * Input: { riskId: number }
     * 
     * Comunicação:
     * Frontend: trpc.risks.delete.useMutation()
     * Backend: Chama db.deleteRisk(riskId)
     * Database: DELETE FROM risks WHERE id = ?
     * 
     * Fluxo no Frontend:
     * 1. Usuário passa mouse sobre círculo de risco
     * 2. Botão X aparece
     * 3. Usuário clica X
     * 4. deleteRiskMutation.mutateAsync() deleta do BD
     * 5. Círculo desaparece do mapa
     * 
     * Veja: RiskMapEditor.tsx → handleDeleteRisk
     */
    delete: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "riskId" in val) {
          return { riskId: (val as { riskId: unknown }).riskId as number };
        }
        throw new Error("Invalid input");
      })
      .mutation(({ input }) => db.deleteRisk(input.riskId)),
  }),

  // ============================================================================
  // IA (ai) - Integração com LLM
  // ============================================================================
  ai: router({
    /**
     * MUTATION: ai.generateFloorPlan
     * Gera planta baixa em SVG usando IA (Claude/GPT)
     * 
     * Input: { description: string }
     * Exemplo: "Escritório com 10 funcionários, computadores, ar condicionado"
     * 
     * Comunicação:
     * Frontend: trpc.ai.generateFloorPlan.useMutation()
     * Backend: Chama generateFloorPlan(description) de server/llm-helpers.ts
     * LLM: Envia prompt ao Claude/GPT com instruções para gerar SVG
     * 
     * Retorna: { svg: string, width: number, height: number }
     * 
     * Fluxo:
     * 1. Usuário digita descrição do ambiente
     * 2. Clica "Gerar Mapa"
     * 3. generateFloorPlanMutation.mutateAsync() envia para backend
     * 4. Backend chama LLM com prompt estruturado
     * 5. LLM retorna SVG válido
     * 6. Frontend renderiza SVG no canvas
     * 
     * Implementação: server/helpers/llmHelpers.ts → generateFloorPlanSVG
     * 
     * Veja: RiskMapEditor.tsx → handleGenerateMap
     */
    generateFloorPlan: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "string") return { description: val };
        if (typeof val === "object" && val !== null && "description" in val) {
          return {
            description: (val as { description: unknown }).description as string,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { generateFloorPlan } = await import("./llm-helpers");
        return generateFloorPlan(input.description);
      }),

    /**
     * MUTATION: ai.identifyRisks
     * Identifica riscos ocupacionais usando IA (Claude/GPT)
     * 
     * Input: { description: string }
     * Exemplo: "Escritório com 10 funcionários, computadores, ar condicionado"
     * 
     * Comunicação:
     * Frontend: trpc.ai.identifyRisks.useMutation()
     * Backend: Chama identifyRisks(description) de server/llm-helpers.ts
     * LLM: Envia prompt ao Claude/GPT com instruções para extrair riscos
     * 
     * Retorna: Array de { type, severity, label, description }
     * Exemplo:
     * [
     *   { type: "ergonomic", severity: "high", label: "Postura inadequada", description: "..." },
     *   { type: "physical", severity: "medium", label: "Iluminação inadequada", description: "..." }
     * ]
     * 
     * Fluxo:
     * 1. Usuário digita descrição do ambiente
     * 2. Clica "Gerar Mapa"
     * 3. identifyRisksMutation.mutateAsync() envia para backend
     * 4. Backend chama LLM com prompt estruturado
     * 5. LLM retorna JSON com riscos identificados
     * 6. Frontend cria círculos para cada risco no mapa
     * 
     * Implementação: server/helpers/llmHelpers.ts → identifyOccupationalRisks
     * 
     * Veja: RiskMapEditor.tsx → handleGenerateMap
     */
    identifyRisks: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "string") return { description: val };
        if (typeof val === "object" && val !== null && "description" in val) {
          return {
            description: (val as { description: unknown }).description as string,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { identifyRisks } = await import("./llm-helpers");
        return identifyRisks(input.description);
      }),
  }),
});

// ============================================================================
// TIPO EXPORTADO
// ============================================================================

/**
 * AppRouter: Tipo TypeScript do router
 * Usado para inferir tipos no frontend (client/src/lib/trpc.ts)
 * Permite autocomplete e type-checking em trpc.*.useQuery/useMutation
 */
export type AppRouter = typeof appRouter;
