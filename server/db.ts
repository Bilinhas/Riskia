import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, riskMaps, risks, InsertRiskMap, InsertRisk } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all risk maps for a user
 */
export async function getUserRiskMaps(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(riskMaps)
    .where(eq(riskMaps.userId, userId))
    .orderBy((t) => t.createdAt);
}

/**
 * Get a specific risk map with all its risks
 */
export async function getRiskMapWithRisks(mapId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const map = await db
    .select()
    .from(riskMaps)
    .where(eq(riskMaps.id, mapId))
    .limit(1);

  if (!map.length || map[0].userId !== userId) return null;

  const mapRisks = await db
    .select()
    .from(risks)
    .where(eq(risks.mapId, mapId));

  return { map: map[0], risks: mapRisks };
}

/**
 * Create a new risk map
 */
export async function createRiskMap(data: InsertRiskMap) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(riskMaps).values(data);
  return result;
}

/**
 * Add a risk to a map
 */
export async function addRisk(data: InsertRisk) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(risks).values(data);
  return result;
}

/**
 * Update risk position (for drag and drop)
 */
export async function updateRiskPosition(
  riskId: number,
  xPosition: number,
  yPosition: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db
    .update(risks)
    .set({ xPosition, yPosition })
    .where(eq(risks.id, riskId));
}

/**
 * Update risk properties
 */
export async function updateRisk(riskId: number, data: Partial<InsertRisk>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.update(risks).set(data).where(eq(risks.id, riskId));
}

/**
 * Delete a risk
 */
export async function deleteRisk(riskId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return db.delete(risks).where(eq(risks.id, riskId));
}

/**
 * Delete a risk map and all its risks
 */
export async function deleteRiskMap(mapId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Delete all risks first
  await db.delete(risks).where(eq(risks.mapId, mapId));
  // Then delete the map
  return db.delete(riskMaps).where(eq(riskMaps.id, mapId));
}
