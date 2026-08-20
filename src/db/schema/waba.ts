import { pgTable, uuid, text, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const wabaQualityEnum = pgEnum("waba_quality_rating", ["GREEN", "YELLOW", "RED", "UNKNOWN"]);
export const wabaTierEnum = pgEnum("waba_tier", ["TIER_1", "TIER_2", "TIER_3", "TIER_4", "UNLIMITED"]);
export const wabaAccountModeEnum = pgEnum("waba_account_mode", ["SANDBOX", "LIVE"]);

export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "pending", "sent", "failed", "blocked_optout", "quota_exceeded",
]);

export const optoutSourceEnum = pgEnum("optout_source", [
  "keyword", "api", "import", "manual",
]);

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "contact_created", "lead_distributed", "reopen_conversation", "sla_breach",
]);

// ── Saúde e uso diário WABA ───────────────────────────────────────────────────

export const wabaHealthLog = pgTable("waba_health_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  phoneNumberId: text("phone_number_id").notNull(),
  qualityRating: wabaQualityEnum("quality_rating").notNull().default("UNKNOWN"),
  tier: wabaTierEnum("tier").notNull().default("TIER_1"),
  accountMode: wabaAccountModeEnum("account_mode").notNull().default("LIVE"),
  dailyLimit: integer("daily_limit").notNull().default(1000),
  sentCount: integer("sent_count").notNull().default(0),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

export type WabaHealthLog = typeof wabaHealthLog.$inferSelect;

// ── Fila de disparos ──────────────────────────────────────────────────────────

export const messageDispatchQueue = pgTable("message_dispatch_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  phoneNumberId: text("phone_number_id").notNull(),
  toPhone: text("to_phone").notNull(),
  templateName: text("template_name"),
  templateParams: jsonb("template_params"),
  messageText: text("message_text"),
  status: dispatchStatusEnum("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MessageDispatch = typeof messageDispatchQueue.$inferSelect;

// ── Opt-out / Blacklist ───────────────────────────────────────────────────────

export const contactOptouts = pgTable("contact_optouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  // null = global (vale para todos os tenants)
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  reason: text("reason"),
  source: optoutSourceEnum("source").notNull().default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContactOptout = typeof contactOptouts.$inferSelect;

// ── Opt-in ────────────────────────────────────────────────────────────────────

export const contactOptins = pgTable("contact_optins", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  channel: text("channel").notNull().default("whatsapp"),
  consentText: text("consent_text"),
  ip: text("ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContactOptin = typeof contactOptins.$inferSelect;

// ── Automações de mensagens ───────────────────────────────────────────────────

export const messageAutomations = pgTable("message_automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: automationTriggerEnum("trigger").notNull(),
  templateName: text("template_name"),
  templateParams: jsonb("template_params"),
  messageText: text("message_text"),
  channel: text("channel").notNull().default("whatsapp"),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  conditions: jsonb("conditions"),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MessageAutomation = typeof messageAutomations.$inferSelect;
