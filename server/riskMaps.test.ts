import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("riskMaps procedures", () => {
  it("should create a risk map", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.riskMaps.create({
      title: "Test Map",
      description: "Test Description",
      floorPlanSvg: "<svg></svg>",
      width: 1000,
      height: 800,
    });

    expect(result).toHaveProperty("insertId");
    expect(typeof result.insertId).toBe("number");
  });

  it("should list risk maps for user", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Create a map first
    await caller.riskMaps.create({
      title: "Test Map",
      description: "Test Description",
      floorPlanSvg: "<svg></svg>",
      width: 1000,
      height: 800,
    });

    // List maps
    const maps = await caller.riskMaps.list();

    expect(Array.isArray(maps)).toBe(true);
  });

  it("should delete a risk map", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a map first
    const createResult = await caller.riskMaps.create({
      title: "Test Map to Delete",
      description: "Test Description",
      floorPlanSvg: "<svg></svg>",
      width: 1000,
      height: 800,
    });

    const mapId = createResult.insertId as number;

    // Delete the map
    const deleteResult = await caller.riskMaps.delete({ mapId });

    expect(deleteResult).toBeDefined();
  });
});

describe("risks procedures", () => {
  let mapId: number;

  beforeEach(async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.riskMaps.create({
      title: "Test Map",
      description: "Test Description",
      floorPlanSvg: "<svg></svg>",
      width: 1000,
      height: 800,
    });

    mapId = result.insertId as number;
  });

  it("should add a risk to a map", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.risks.add({
      mapId,
      type: "ergonomic",
      severity: "high",
      label: "Poor Posture",
      description: "Employees lack proper ergonomic support",
      xPosition: 100,
      yPosition: 100,
      radius: 30,
      color: "#6BCB77",
    });

    expect(result).toHaveProperty("insertId");
    expect(typeof result.insertId).toBe("number");
  });

  it("should update risk position", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add a risk first
    const addResult = await caller.risks.add({
      mapId,
      type: "ergonomic",
      severity: "high",
      label: "Poor Posture",
      description: "Employees lack proper ergonomic support",
      xPosition: 100,
      yPosition: 100,
      radius: 30,
      color: "#6BCB77",
    });

    const riskId = addResult.insertId as number;

    // Update position
    const updateResult = await caller.risks.updatePosition({
      riskId,
      xPosition: 200,
      yPosition: 200,
    });

    expect(updateResult).toBeDefined();
  });

  it("should delete a risk", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Add a risk first
    const addResult = await caller.risks.add({
      mapId,
      type: "ergonomic",
      severity: "high",
      label: "Poor Posture",
      description: "Employees lack proper ergonomic support",
      xPosition: 100,
      yPosition: 100,
      radius: 30,
      color: "#6BCB77",
    });

    const riskId = addResult.insertId as number;

    // Delete the risk
    const deleteResult = await caller.risks.delete({ riskId });

    expect(deleteResult).toBeDefined();
  });
});
