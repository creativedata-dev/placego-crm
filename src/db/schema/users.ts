import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const userRoleEnum = pgEnum("user_role", [
  "admin_placego",
  "sdr",
  "corretor",
  "admin_tenant",
  "corretor_tenant",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // same as Supabase Auth user id
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
