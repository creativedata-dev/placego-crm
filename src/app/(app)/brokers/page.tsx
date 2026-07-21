import Link from "next/link";
import { db } from "@/db";
import { users, brokerPreferences, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { eq, inArray } from "drizzle-orm";

export default async function BrokersPage() {
  const user = await requireRole(["admin_placego", "admin_tenant", "sdr"]);

  const isAdmin = user.role === "admin_placego" || user.role === "admin_tenant";

  const brokerList = await db
    .select({
      user: users,
      tenantName: tenants.name,
      creci: brokerPreferences.creci,
      cities: brokerPreferences.cities,
    })
    .from(users)
    .leftJoin(tenants, eq(users.tenantId, tenants.id))
    .leftJoin(brokerPreferences, eq(users.id, brokerPreferences.brokerId))
    .where(inArray(users.role, ["corretor", "corretor_tenant"]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corretores</h1>
          <p className="text-muted-foreground text-sm">Corretores internos e de tenants</p>
        </div>
        {isAdmin && (
          <Button nativeButton={false} render={<Link href="/brokers/new" />}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Corretor
          </Button>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {brokerList.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhum corretor cadastrado.</p>
        )}
        {brokerList.map(({ user: u, tenantName, creci, cities }) => {
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
                {u.isActive
                  ? <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  : <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />}
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {creci && <span className="font-mono">CRECI: {creci}</span>}
                {u.phone && <span>📱 {u.phone}</span>}
                {tenantName && <span>🏢 {tenantName}</span>}
                {cities && cities.length > 0 && <span>📍 {cities.slice(0, 2).join(", ")}{cities.length > 2 ? "…" : ""}</span>}
              </div>
              {isAdmin && (
                <div className="pt-1 border-t">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" nativeButton={false} render={<Link href={`/brokers/${u.id}/edit`} />}>
                    Editar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corretor</TableHead>
              <TableHead>CRECI</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidades</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {brokerList.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum corretor cadastrado.
                </TableCell>
              </TableRow>
            )}
            {brokerList.map(({ user: u, tenantName, creci, cities }) => {
              const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <TableRow key={u.id}>
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
                  <TableCell className="text-sm font-mono">{creci ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cities && cities.length > 0 ? cities.slice(0, 2).join(", ") + (cities.length > 2 ? "…" : "") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tenantName ?? "PlaceGo"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {u.role === "corretor" ? "Interno" : "Tenant"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Inativo
                      </span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/brokers/${u.id}/edit`} />}>
                        Editar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
