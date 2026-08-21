import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { WabaHealth } from "@/app/(app)/tenants/[id]/whatsapp/waba-health";
import { Wifi } from "lucide-react";
import Link from "next/link";

export default async function WabaPage() {
  await requireRole(["admin_placego"]);

  const metaTenants = await db
    .select({ id: tenants.id, name: tenants.name, slug: tenants.slug, metaPhoneNumberId: tenants.metaPhoneNumberId })
    .from(tenants)
    .where(eq(tenants.whatsappProvider, "meta_cloud"));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wifi className="h-6 w-6 text-muted-foreground" />
          Saúde WABA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Status das contas WhatsApp Business configuradas com Meta Cloud API.
        </p>
      </div>

      {metaTenants.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
          <Wifi className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>Nenhuma empresa com Meta Cloud API configurada.</p>
          <p className="mt-1">
            Configure em{" "}
            <Link href="/tenants" className="text-blue-600 hover:underline">
              Empresas → WhatsApp
            </Link>
            .
          </p>
        </div>
      )}

      {metaTenants.map((tenant) => (
        <div key={tenant.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">{tenant.name}</h2>
            <Link
              href={`/tenants/${tenant.id}/whatsapp`}
              className="text-xs text-blue-600 hover:underline"
            >
              Configurações →
            </Link>
          </div>
          <WabaHealth tenantId={tenant.id} />
        </div>
      ))}
    </div>
  );
}
