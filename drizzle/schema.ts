import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Risk type enumeration
export const riskTypeEnum = [
  'acidental',
  'chemical',
  'ergonomic',
  'physical',
  'biological',
] as const;

export type RiskType = (typeof riskTypeEnum)[number];

// Severity level enumeration
export const severityEnum = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof severityEnum)[number];

/**
 * Risk maps table - stores the main risk map documents
 */
export const riskMaps = mysqlTable('risk_maps', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  floorPlanSvg: text('floor_plan_svg').notNull(), // SVG of the floor plan
  width: int('width').notNull().default(1000),
  height: int('height').notNull().default(800),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type RiskMap = typeof riskMaps.$inferSelect;
export type InsertRiskMap = typeof riskMaps.$inferInsert;

/**
 * Risks table - stores individual risk markers on maps
 */
export const risks = mysqlTable('risks', {
  id: int('id').autoincrement().primaryKey(),
  mapId: int('map_id').notNull(),
  type: mysqlEnum('type', riskTypeEnum).notNull(),
  severity: mysqlEnum('severity', severityEnum).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  xPosition: int('x_position').notNull(), // X coordinate on the map
  yPosition: int('y_position').notNull(), // Y coordinate on the map
  radius: int('radius').notNull().default(30), // Circle radius in pixels
  color: varchar('color', { length: 7 }).notNull(), // Hex color code
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Risk = typeof risks.$inferSelect;
export type InsertRisk = typeof risks.$inferInsert;