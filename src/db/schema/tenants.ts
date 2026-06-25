import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const tenantTypeEnum = pgEnum("tenant_type", [
  "imobiliaria",
  "incorporadora",
  "construtora",
  "corretor",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: tenantTypeEnum("type").notNull(),
  slug: text("slug").notNull().unique(),
  webhookToken: text("webhook_token").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
