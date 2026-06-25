import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { PropertyForm } from "@/components/properties/property-form";
import { updateProperty } from "@/app/actions/properties";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin_placego", "admin_tenant"]);
  const { id } = await params;

  const [[property], tenantList] = await Promise.all([
    db.select().from(properties).where(eq(properties.id, id)).limit(1),
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
  ]);

  if (!property) notFound();

  const action = updateProperty.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Imóvel</h1>
        <p className="text-muted-foreground text-sm">{property.address}</p>
      </div>
      <PropertyForm action={action} defaultValues={property} tenants={tenantList} />
    </div>
  );
}
