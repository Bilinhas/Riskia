import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  riskMaps: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getUserRiskMaps(ctx.user.id)
    ),

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
        // Drizzle returns the result with insertId in the first element of the array
        const insertId = (result as any)[0]?.insertId || (result as any).insertId;
        if (!insertId) {
          console.error('Drizzle result:', result);
          throw new Error('Failed to create risk map: no insertId returned');
        }
        return { insertId };
      }),

    delete: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "mapId" in val) {
          return { mapId: (val as { mapId: unknown }).mapId as number };
        }
        throw new Error("Invalid input");
      })
      .mutation(({ input }) => db.deleteRiskMap(input.mapId)),
  }),

  risks: router({
    add: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null) {
          const obj = val as Record<string, unknown>;
          return {
            mapId: obj.mapId as number,
            type: obj.type as string,
            severity: obj.severity as string,
            label: obj.label as string,
            description: obj.description as string,
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
        // Drizzle returns the result with insertId in the first element of the array
        const insertId = (result as any)[0]?.insertId || (result as any).insertId;
        if (!insertId) {
          console.error('Drizzle result:', result);
          throw new Error('Failed to create risk map: no insertId returned');
        }
        return { insertId };
      }),

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

    delete: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "riskId" in val) {
          return { riskId: (val as { riskId: unknown }).riskId as number };
        }
        throw new Error("Invalid input");
      })
      .mutation(({ input }) => db.deleteRisk(input.riskId)),
  }),

  ai: router({
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

export type AppRouter = typeof appRouter;
