import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PropertyForm } from "@/components/properties/property-form";
import { createProperty } from "@/app/actions/properties";

export default async function NewPropertyPage() {
  await requireRole(["admin_placego", "admin_tenant"]);
  const tenantList = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Imóvel</h1>
        <p className="text-muted-foreground text-sm">Cadastrar imóvel avulso</p>
      </div>
      <PropertyForm action={createProperty} tenants={tenantList} />
    </div>
  );
}
