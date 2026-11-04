import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey(), collegeId: text("college_id"), competition: text("competition").notNull(), topic: text("topic"),
  status: text("status").notNull().default("confirmed"), payload: text("payload").notNull(),
  requestKey: text("request_key").notNull().unique(), createdAt: text("created_at").notNull(), cancelledAt: text("cancelled_at"),
}, (t) => [index("registrations_capacity_idx").on(t.competition, t.status, t.topic), index("registrations_college_capacity_idx").on(t.collegeId,t.competition,t.status,t.topic)]);
export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
export const audit = sqliteTable("audit", { id: text("id").primaryKey(), actor: text("actor").notNull(), action: text("action").notNull(), target: text("target").notNull(), createdAt: text("created_at").notNull() });
