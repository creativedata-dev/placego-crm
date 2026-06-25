import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { TenantForm } from "@/components/tenants/tenant-form";
import { updateTenant } from "@/app/actions/tenants";

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin_placego"]);
  const { id } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const action = updateTenant.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Tenant</h1>
        <p className="text-muted-foreground text-sm">{tenant.name}</p>
      </div>
      <TenantForm action={action} defaultValues={tenant} />
    </div>
  );
}
