import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { WhatsAppManager } from "./whatsapp-manager";
import { MetaCloudConfig } from "./meta-cloud-config";
import { MetaTutorial } from "./meta-tutorial";

export default async function TenantWhatsAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin_placego"]);
  const { id } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const instanceName = `placego-${tenant.slug}`;
  const provider = (tenant.whatsappProvider ?? "evolution") as "evolution" | "meta_cloud";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">Empresa</p>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
      </div>

      {/* Seletor de provedor */}
      <MetaCloudConfig
        tenantId={id}
        provider={provider}
        metaPhoneNumberId={tenant.metaPhoneNumberId ?? ""}
        metaAccessToken={tenant.metaAccessToken ?? ""}
        metaWabaId={tenant.metaWabaId ?? ""}
      />

      {/* Tutorial Meta Cloud */}
      <MetaTutorial />

      {/* Evolution API — só exibe se provedor = evolution */}
      {provider === "evolution" && (
        <div className="border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-lg">Evolution API — Conexão QR Code</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte o número via QR Code. Os corretores receberão notificações por este número.
            </p>
          </div>
          <WhatsAppManager
            tenantId={id}
            tenantName={tenant.name}
            instanceName={instanceName}
          />
        </div>
      )}
    </div>
  );
}
