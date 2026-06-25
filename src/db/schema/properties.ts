import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const propertyTypeEnum = pgEnum("property_type", [
  "apartamento",
  "casa",
  "comercial",
  "terreno",
  "cobertura",
  "studio",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "ativo",
  "vendido",
  "suspenso",
]);

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  type: propertyTypeEnum("type").notNull(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("SP"),
  price: numeric("price", { precision: 12, scale: 2 }),
  areaM2: numeric("area_m2", { precision: 8, scale: 2 }),
  bedrooms: integer("bedrooms"),
  suites: integer("suites"),
  parkingSpots: integer("parking_spots"),
  status: propertyStatusEnum("status").notNull().default("ativo"),
  externalId: text("external_id"), // para sync com marketplace
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const developments = pgTable("developments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("SP"),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }),
  status: propertyStatusEnum("status").notNull().default("ativo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
export type Development = typeof developments.$inferSelect;
export type NewDevelopment = typeof developments.$inferInsert;
