import Link from "next/link";
import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { ResetPasswordButton } from "./reset-password-button";
import { ToggleActiveButton } from "./toggle-active-button";

const ROLE_LABELS: Record<string, string> = {
  admin_placego: "Admin PlaceGo",
  sdr: "SDR",
  corretor: "Corretor",
  admin_tenant: "Admin Empresa",
  corretor_tenant: "Corretor Empresa",
};

const ROLE_COLORS: Record<string, string> = {
  admin_placego: "bg-purple-500/10 text-purple-700 border-purple-200",
  sdr: "bg-blue-500/10 text-blue-700 border-blue-200",
  corretor: "bg-green-500/10 text-green-700 border-green-200",
  admin_tenant: "bg-orange-500/10 text-orange-700 border-orange-200",
  corretor_tenant: "bg-teal-500/10 text-teal-700 border-teal-200",
};

export default async function UsersPage() {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  const isAdminPlacego = currentUser.role === "admin_placego";

  // admin_tenant vê apenas usuários do seu tenant (roles de tenant)
  const whereClause = isAdminPlacego
    ? undefined
    : currentUser.tenantId
    ? and(
        inArray(users.role, ["admin_tenant", "corretor_tenant"]),
        eq(users.tenantId, currentUser.tenantId)
      )
    : undefined;

  const userList = await db
    .select({ user: users, tenantName: tenants.name })
    .from(users)
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .where(whereClause)
    .orderBy(users.createdAt);

  const grouped = {
    admin_placego: userList.filter((u) => u.user.role === "admin_placego"),
    sdr: userList.filter((u) => u.user.role === "sdr"),
    corretor: userList.filter((u) => u.user.role === "corretor"),
    admin_tenant: userList.filter((u) => u.user.role === "admin_tenant"),
    corretor_tenant: userList.filter((u) => u.user.role === "corretor_tenant"),
  };

  const visibleRoles = isAdminPlacego
    ? Object.entries(ROLE_LABELS)
    : [["admin_tenant", "Admin Empresa"], ["corretor_tenant", "Corretor Empresa"]] as [string, string][];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            {isAdminPlacego ? "Gestão de acesso ao sistema" : "Usuários da sua empresa"} — {userList.length} usuários
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/users/new" />}>
          <Plus className="h-4 w-4 mr-2" />
          Novo usuário
        </Button>
      </div>

      {/* Resumo por role */}
      <div className={`grid gap-2 ${isAdminPlacego ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2"}`}>
        {visibleRoles.map(([role, label]) => (
          <div key={role} className="border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{grouped[role as keyof typeof grouped]?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {userList.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhum usuário cadastrado.</p>
        )}
        {userList.map(({ user: u, tenantName }) => {
          const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
          return (
            <div key={u.id} className={`border rounded-xl p-3 space-y-2 ${!u.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                {u.isActive ? (
                  <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
                {tenantName && (
                  <span className="text-xs text-muted-foreground truncate">🏢 {tenantName}</span>
                )}
              </div>
              <div className="flex gap-1 pt-1 border-t">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" nativeButton={false} render={<Link href={`/users/${u.id}/edit`} />}>
                  Editar
                </Button>
                <ToggleActiveButton userId={u.id} isActive={u.isActive} userName={u.name} />
                <ResetPasswordButton userId={u.id} userEmail={u.email} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {userList.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
            {userList.map(({ user: u, tenantName }) => {
              const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tenantName ?? <span className="text-muted-foreground/50">PlaceGo</span>}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/users/${u.id}/edit`} />}>
                        Editar
                      </Button>
                      <ToggleActiveButton userId={u.id} isActive={u.isActive} userName={u.name} />
                      <ResetPasswordButton userId={u.id} userEmail={u.email} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
