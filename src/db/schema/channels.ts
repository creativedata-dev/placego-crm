import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { jsonb } from "drizzle-orm/pg-core";

export const channelTypeEnum = pgEnum("channel_type", [
  "whatsapp", "instagram_dm", "facebook_dm",
  "meta_comment", "email", "meta_leadgen", "lp", "portal",
]);

export const companyChannels = pgTable("company_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  channelType: channelTypeEnum("channel_type").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  config: jsonb("config").default({}),
  welcomeMessage: text("welcome_message"),
  businessHours: jsonb("business_hours").default({}),
  afterHoursMessage: text("after_hours_message"),
  keywords: text("keywords").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CompanyChannel = typeof companyChannels.$inferSelect;
export type NewCompanyChannel = typeof companyChannels.$inferInsert;
