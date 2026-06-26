import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { createBroker } from "@/app/actions/brokers";
import { NewBrokerForm } from "./new-broker-form";

export default async function NewBrokerPage() {
  await requireRole(["admin_placego", "admin_tenant"]);
  const tenantList = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Corretor</h1>
        <p className="text-muted-foreground text-sm">
          Cadastre os dados e preferências de afinidade do corretor
        </p>
      </div>
      <NewBrokerForm action={createBroker} tenants={tenantList} />
    </div>
  );
}
