import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { listAutomations } from "@/app/actions/automations";
import { listOptouts } from "@/app/actions/optout";
import { AutomationsManager } from "./automations-manager";
import { listTemplates } from "@/lib/meta-waba";

export default async function AutomationsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  const { id } = await params;

  if (currentUser.role === "admin_tenant" && currentUser.tenantId !== id) notFound();

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const [automations, optouts] = await Promise.all([
    listAutomations(id),
    listOptouts(id),
  ]);

  // Templates aprovados da WABA para automações personalizadas
  let approvedTemplates: { name: string; params: number; bodyText: string }[] = [];
  if (tenant.metaWabaId && tenant.metaAccessToken) {
    try {
      const templates = await listTemplates(tenant.metaWabaId, tenant.metaAccessToken);
      approvedTemplates = templates
        .filter((t) => t.status === "APPROVED")
        .map((t) => {
          const body = t.components.find((c: any) => c.type === "BODY") as any;
          const paramCount = (body?.text?.match(/\{\{\d+\}\}/g) ?? []).length;
          return { name: t.name, params: paramCount, bodyText: body?.text ?? "" };
        });
    } catch { /* sem templates */ }
  }

  return (
    <AutomationsManager
      tenantId={id}
      tenantName={tenant.name}
      automations={automations}
      approvedTemplates={approvedTemplates}
      isMetaCloud={tenant.whatsappProvider === "meta_cloud"}
      autoWelcome={tenant.metaAutoWelcome}
      welcomeMessage={tenant.metaWelcomeMessage ?? ""}
      optoutKeywords={(tenant.metaOptoutKeywords as string[] | null) ?? ["PARAR", "STOP", "CANCELAR", "SAIR", "NAO QUERO", "NÃO QUERO"]}
      optouts={optouts}
    />
  );
}
