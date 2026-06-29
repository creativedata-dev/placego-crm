import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { createUser } from "@/app/actions/users";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireRole(["admin_placego"]);
  const tenantList = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Usuário</h1>
        <p className="text-muted-foreground text-sm">
          Crie o acesso ao sistema. Para corretores, complete o perfil comercial em Corretores após criar.
        </p>
      </div>
      <UserForm action={createUser} tenants={tenantList} />
    </div>
  );
}
