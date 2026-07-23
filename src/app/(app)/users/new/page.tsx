import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { createUser } from "@/app/actions/users";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  const tenantList = currentUser.role === "admin_placego"
    ? await db.select({ id: tenants.id, name: tenants.name }).from(tenants)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Usuário</h1>
        <p className="text-muted-foreground text-sm">
          {currentUser.role === "admin_tenant"
            ? "Crie acesso para um membro da sua empresa."
            : "Crie o acesso ao sistema. Para corretores, complete o perfil em Corretores após criar."}
        </p>
      </div>
      <UserForm action={createUser} tenants={tenantList} isAdminTenant={currentUser.role === "admin_tenant"} />
    </div>
  );
}
