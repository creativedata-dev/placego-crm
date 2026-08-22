/**
 * Engine de automações de mensagens.
 * Ao disparar um trigger, busca as automações ativas do tenant,
 * substitui variáveis e insere na fila de disparo.
 */

import { db } from "@/db";
import { messageAutomations, messageDispatchQueue, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { AutomationTrigger } from "@/app/actions/automations";

export interface AutomationContext {
  tenantId: string;
  contact?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  assignmentId?: string;
  sdrName?: string;
  brokerName?: string;
  appUrl?: string;
}

function interpolate(text: string, ctx: AutomationContext): string {
  const appUrl = ctx.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
  return text
    .replace(/\{\{nome\}\}/g, ctx.contact?.name ?? "")
    .replace(/\{\{telefone\}\}/g, ctx.contact?.phone ?? "")
    .replace(/\{\{link_crm\}\}/g, ctx.assignmentId ? `${appUrl}/pipeline/${ctx.assignmentId}` : appUrl)
    .replace(/\{\{sdr_nome\}\}/g, ctx.sdrName ?? "")
    .replace(/\{\{corretor_nome\}\}/g, ctx.brokerName ?? "");
}

function interpolateParams(params: Record<string, string> | null | undefined, ctx: AutomationContext): Record<string, string> {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, interpolate(String(v), ctx)])
  );
}

export async function fireAutomation(trigger: AutomationTrigger, ctx: AutomationContext) {
  if (!ctx.contact?.phone) return; // sem telefone, não tem como enviar

  // Busca tenant para pegar phone_number_id
  const [tenant] = await db.select({
    whatsappProvider: tenants.whatsappProvider,
    metaPhoneNumberId: tenants.metaPhoneNumberId,
    metaAccessToken: tenants.metaAccessToken,
  }).from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1);

  if (!tenant?.metaPhoneNumberId || !tenant?.metaAccessToken) return; // só Meta Cloud por ora

  // Busca automações ativas para este trigger e tenant
  const automations = await db
    .select()
    .from(messageAutomations)
    .where(
      and(
        eq(messageAutomations.tenantId, ctx.tenantId),
        eq(messageAutomations.trigger, trigger),
        eq(messageAutomations.active, "true")
      )
    );

  for (const automation of automations) {
    const scheduledAt = new Date(Date.now() + (automation.delayMinutes ?? 0) * 60 * 1000);

    const toPhone = ctx.contact.phone!;

    if (automation.templateName) {
      const params = interpolateParams(automation.templateParams as Record<string, string> | null, ctx);
      await db.insert(messageDispatchQueue).values({
        tenantId: ctx.tenantId,
        phoneNumberId: tenant.metaPhoneNumberId!,
        toPhone,
        templateName: automation.templateName,
        templateParams: params,
        scheduledAt,
      });
    } else if (automation.messageText) {
      const text = interpolate(automation.messageText, ctx);
      await db.insert(messageDispatchQueue).values({
        tenantId: ctx.tenantId,
        phoneNumberId: tenant.metaPhoneNumberId!,
        toPhone,
        messageText: text,
        scheduledAt,
      });
    }
  }
}
