import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { WhatsAppManager } from "./whatsapp-manager";

export default async function TenantWhatsAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin_placego"]);
  const { id } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  // Nome da instância: slug da empresa
  const instanceName = `placego-${tenant.slug}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">Empresa</p>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
      </div>

      <div className="border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-lg">WhatsApp — Evolution API</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte o número de WhatsApp da empresa. Os corretores receberão notificações
            de novos leads por este número.
          </p>
        </div>

        <WhatsAppManager
          tenantId={id}
          tenantName={tenant.name}
          instanceName={instanceName}
        />
      </div>
    </div>
  );
}
