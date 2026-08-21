import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants, companyChannels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ChannelsManager } from "./channels-manager";

export default async function CompanyChannelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  const { id } = await params;

  if (currentUser.role === "admin_tenant" && currentUser.tenantId !== id) {
    notFound();
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const channels = await db
    .select()
    .from(companyChannels)
    .where(eq(companyChannels.companyId, id));

  return (
    <ChannelsManager
      tenantId={id}
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      webhookToken={tenant.webhookToken ?? ""}
      whatsappProvider={(tenant.whatsappProvider ?? "evolution") as "evolution" | "meta_cloud"}
      metaPhoneNumberId={tenant.metaPhoneNumberId ?? ""}
      metaAccessToken={tenant.metaAccessToken ?? ""}
      metaWabaId={tenant.metaWabaId ?? ""}
      metaVerifyToken={tenant.metaVerifyToken ?? ""}
      metaAutoWelcome={tenant.metaAutoWelcome ?? true}
      channels={channels}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
    />
  );
}
