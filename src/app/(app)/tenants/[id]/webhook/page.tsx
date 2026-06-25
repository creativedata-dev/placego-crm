import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { WebhookManager } from "./webhook-manager";

export default async function TenantWebhookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin_placego"]);
  const { id } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
  const webhookUrl = tenant.webhookToken
    ? `${appUrl}/api/leads/capture?token=${tenant.webhookToken}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">Tenant</p>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
      </div>

      <div className="border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-lg">Integração Meta Lead Ads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure esta URL no Business Manager do tenant como destino do webhook de leads.
            Cada tenant tem um token único — leads chegam automaticamente vinculados a ele.
          </p>
        </div>

        <WebhookManager
          tenantId={id}
          tenantName={tenant.name}
          currentToken={tenant.webhookToken ?? null}
          webhookUrl={webhookUrl}
        />

        {webhookUrl && (
          <div className="space-y-3 pt-2 border-t">
            <h3 className="font-medium text-sm">Configuração no Meta Business Manager</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Acesse o BM do tenant → <strong>Configurações do negócio → Webhooks</strong></li>
              <li>Clique em <strong>Adicionar</strong> e selecione <strong>Lead</strong></li>
              <li>Cole a URL acima no campo <strong>URL do Callback</strong></li>
              <li>No campo <strong>Token de verificação</strong>, cole o mesmo token acima</li>
              <li>Assine o evento <strong>leadgen</strong></li>
              <li>Clique em <strong>Verificar e salvar</strong></li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
