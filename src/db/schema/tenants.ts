import { pgTable, uuid, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

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
  // Canal SDR ↔ contato (fila, qualificação): 'evolution' (padrão) | 'meta_cloud'
  whatsappProvider: text("whatsapp_provider").notNull().default("evolution"),
  metaPhoneNumberId: text("meta_phone_number_id").unique(),
  metaAccessToken: text("meta_access_token"),
  metaWabaId: text("meta_waba_id"),
  // Preenchido quando o número foi conectado via Embedded Signup mantendo o WhatsApp Business App ativo no celular
  metaCoexistence: boolean("meta_coexistence").notNull().default(false),
  metaVerifyToken: text("meta_verify_token"),
  // Canal de distribuição/notificação ao corretor: 'same_as_contact' (padrão, usa o canal acima) | 'evolution' | 'meta_cloud'
  brokerWhatsappProvider: text("broker_whatsapp_provider").notNull().default("same_as_contact"),
  brokerMetaPhoneNumberId: text("broker_meta_phone_number_id").unique(),
  brokerMetaAccessToken: text("broker_meta_access_token"),
  brokerMetaWabaId: text("broker_meta_waba_id"),
  // Instância Evolution dedicada para falar com o corretor (separada da instância usada com o contato).
  // Vazio = reusa a instância `placego-${slug}` do contato (comportamento legado).
  brokerEvolutionInstance: text("broker_evolution_instance").unique(),
  metaOptoutKeywords: text("meta_optout_keywords").array(),
  // Enviar template de boas-vindas automaticamente ao criar novo contato
  metaAutoWelcome: boolean("meta_auto_welcome").notNull().default(true),
  metaWelcomeMessage: text("meta_welcome_message"),
  // Template WABA para reabrir janela de 24h (corretor → lead)
  metaReactivationTemplate: text("meta_reactivation_template"),
  // Template WABA enviado ao corretor ao distribuir lead (notificação de novo lead)
  metaDistributionTemplate: text("meta_distribution_template"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
