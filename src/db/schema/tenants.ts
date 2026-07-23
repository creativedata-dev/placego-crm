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
  // WhatsApp provider: 'evolution' (padrão) | 'meta_cloud'
  whatsappProvider: text("whatsapp_provider").notNull().default("evolution"),
  metaPhoneNumberId: text("meta_phone_number_id"),
  metaAccessToken: text("meta_access_token"),
  metaWabaId: text("meta_waba_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
