import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { updateUser } from "@/app/actions/users";
import { UserForm } from "../../user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin_placego"]);
  const { id } = await params;

  const [[user], tenantList] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)).limit(1),
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
  ]);

  if (!user) notFound();

  const action = updateUser.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Usuário</h1>
        <p className="text-muted-foreground text-sm">{user.name} · {user.email}</p>
      </div>
      <UserForm action={action} tenants={tenantList} defaultValues={user} />
    </div>
  );
}
