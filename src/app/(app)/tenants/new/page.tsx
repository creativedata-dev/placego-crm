import { requireRole } from "@/lib/auth";
import { TenantForm } from "@/components/tenants/tenant-form";
import { createTenant } from "@/app/actions/tenants";

export default async function NewTenantPage() {
  await requireRole(["admin_placego"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Tenant</h1>
        <p className="text-muted-foreground text-sm">Cadastrar parceiro no sistema</p>
      </div>
      <TenantForm action={createTenant} />
    </div>
  );
}
