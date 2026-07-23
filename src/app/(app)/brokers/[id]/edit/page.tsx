import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, brokerPreferences, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { updateBrokerPreferences } from "@/app/actions/brokers";
import { BackButton } from "@/components/ui/back-button";
import { BrokerEditForm } from "./broker-edit-form";

const PROPERTY_TYPES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "cobertura", label: "Cobertura" },
  { value: "studio", label: "Studio" },
];

export default async function EditBrokerPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  const { id } = await params;

  const [[broker], [prefs], tenantList] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)).limit(1),
    db.select().from(brokerPreferences).where(eq(brokerPreferences.brokerId, id)).limit(1),
    currentUser.role === "admin_placego"
      ? db.select({ id: tenants.id, name: tenants.name }).from(tenants)
      : Promise.resolve([]),
  ]);

  if (!broker) notFound();

  // admin_tenant só pode editar corretores do seu próprio tenant
  if (currentUser.role === "admin_tenant" && broker.tenantId !== currentUser.tenantId) notFound();

  const action = updateBrokerPreferences.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Corretor</h1>
        <p className="text-muted-foreground text-sm">{broker.name} · {broker.email}</p>
      </div>

      <BrokerEditForm
        action={action}
        tenants={tenantList}
        broker={{
          name: broker.name,
          email: broker.email,
          phone: broker.phone ?? "",
          isActive: broker.isActive,
          tenantId: broker.tenantId ?? "",
        }}
        prefs={{
          creci: prefs?.creci ?? "",
          cities: prefs?.cities?.join(", ") ?? "",
          neighborhoods: prefs?.neighborhoods?.join(", ") ?? "",
          minPrice: prefs?.minPrice ?? "",
          maxPrice: prefs?.maxPrice ?? "",
          propertyTypes: prefs?.propertyTypes ?? [],
        }}
        propertyTypes={PROPERTY_TYPES}
      />
    </div>
  );
}
