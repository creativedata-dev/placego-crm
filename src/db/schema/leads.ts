import {
  pgTable, uuid, text, timestamp, pgEnum, integer, boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { properties, developments } from "./properties";
import { tenants } from "./tenants";

export const contactStageEnum = pgEnum("contact_stage", ["contato", "lead"]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new", "waiting", "qualified", "invalid", "duplicate",
]);

export const leadOriginEnum = pgEnum("lead_origin", [
  "meta_ads", "meta_leadgen", "meta_dm_instagram", "meta_dm_facebook",
  "meta_comment", "whatsapp", "email", "lp", "indicacao", "manual", "portal",
]);

export const sdrAssignmentStatusEnum = pgEnum("sdr_assignment_status", [
  "novo", "em_contato", "aguardando", "qualificado", "invalido",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "new", "contacted", "visiting", "proposal", "won", "lost",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call", "whatsapp", "email", "visit", "note",
]);

export const messageChannelEnum = pgEnum("message_channel", [
  "whatsapp", "instagram_dm", "facebook_dm", "email", "comment",
]);

export const messageDirectionEnum = pgEnum("message_direction", ["in", "out"]);

// Contatos (antes: leads)
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  stage: contactStageEnum("stage").notNull().default("contato"),
  sourcePropertyId: uuid("source_property_id").references(() => properties.id),
  sourceDevelopmentId: uuid("source_development_id").references(() => developments.id),
  origin: leadOriginEnum("origin").notNull().default("manual"),
  campaignId: text("campaign_id"),
  adName: text("ad_name"),
  adsetName: text("adset_name"),
  formName: text("form_name"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  status: leadStatusEnum("status").notNull().default("new"),
  qualityScore: integer("quality_score").default(0),
  sdrId: uuid("sdr_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  qualifiedAt: timestamp("qualified_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Atribuições SDR (round-robin)
export const sdrAssignments = pgTable("sdr_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  sdrId: uuid("sdr_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  status: sdrAssignmentStatusEnum("status").notNull().default("novo"),
  qualifiedAt: timestamp("qualified_at"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Mensagens (timeline unificada)
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  sdrId: uuid("sdr_id").references(() => users.id),
  channel: messageChannelEnum("channel").notNull(),
  direction: messageDirectionEnum("direction").notNull().default("in"),
  content: text("content").notNull(),
  metaMessageId: text("meta_message_id"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
});

// Distribuição de leads → corretores
export const leadAssignments = pgTable("lead_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  brokerId: uuid("broker_id").notNull().references(() => users.id),
  assignedBySdrId: uuid("assigned_by_sdr_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  status: assignmentStatusEnum("status").notNull().default("new"),
  lossReason: text("loss_reason"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Atividades no pipeline do corretor
export const leadActivities = pgTable("lead_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadAssignmentId: uuid("lead_assignment_id").notNull().references(() => leadAssignments.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: activityTypeEnum("type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type SdrAssignment = typeof sdrAssignments.$inferSelect;
export type NewSdrAssignment = typeof sdrAssignments.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type LeadAssignment = typeof leadAssignments.$inferSelect;
export type NewLeadAssignment = typeof leadAssignments.$inferInsert;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type NewLeadActivity = typeof leadActivities.$inferInsert;
