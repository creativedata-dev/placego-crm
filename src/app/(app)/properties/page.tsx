import Link from "next/link";
import { db } from "@/db";
import { properties, developments, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { eq } from "drizzle-orm";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  suspenso: "Suspenso",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ativo: "default",
  vendido: "secondary",
  suspenso: "destructive",
};

const TYPE_LABELS: Record<string, string> = {
  apartamento: "Apto",
  casa: "Casa",
  comercial: "Comercial",
  terreno: "Terreno",
  cobertura: "Cobertura",
  studio: "Studio",
};

export default async function PropertiesPage() {
  const user = await requireRole(["admin_placego", "admin_tenant"]);

  const whereClause = user.role === "admin_tenant" && user.tenantId
    ? eq(properties.tenantId, user.tenantId)
    : undefined;

  const [propList, devList] = await Promise.all([
    db.select({ property: properties, tenantName: tenants.name })
      .from(properties)
      .leftJoin(tenants, eq(properties.tenantId, tenants.id))
      .where(whereClause)
      .orderBy(properties.createdAt),
    db.select({ dev: developments, tenantName: tenants.name })
      .from(developments)
      .leftJoin(tenants, eq(developments.tenantId, tenants.id))
      .orderBy(developments.createdAt),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-muted-foreground text-sm">Imóveis avulsos e empreendimentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/properties/developments/new" />}>
            <Plus className="h-4 w-4 mr-2" />
            Empreendimento
          </Button>
          <Button nativeButton={false} render={<Link href="/properties/new" />}>
            <Plus className="h-4 w-4 mr-2" />
            Imóvel
          </Button>
        </div>
      </div>

      {/* Imóveis */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Imóveis Avulsos</h2>

        {/* Mobile */}
        <div className="sm:hidden space-y-2">
          {propList.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum imóvel cadastrado.</p>
          )}
          {propList.map(({ property: p, tenantName }) => (
            <div key={p.id} className="border rounded-xl p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.address}</p>
                  <p className="text-xs text-muted-foreground">{p.neighborhood}, {p.city}</p>
                </div>
                <Badge variant={STATUS_VARIANT[p.status]} className="shrink-0 text-xs">{STATUS_LABELS[p.status]}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{TYPE_LABELS[p.type] ?? p.type}</Badge>
                {p.price && (
                  <span className="text-xs font-medium text-green-700">
                    {Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                )}
                {tenantName && <span className="text-xs text-muted-foreground">🏢 {tenantName}</span>}
              </div>
              <div className="pt-1 border-t">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" nativeButton={false} render={<Link href={`/properties/${p.id}/edit`} />}>
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Bairro / Cidade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {propList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum imóvel cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {propList.map(({ property: p, tenantName }) => (
                <TableRow key={p.id}>
                  <TableCell><Badge variant="outline">{TYPE_LABELS[p.type] ?? p.type}</Badge></TableCell>
                  <TableCell className="text-sm">{p.address}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.neighborhood}, {p.city}</TableCell>
                  <TableCell className="text-sm">
                    {p.price ? Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tenantName ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABELS[p.status]}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/properties/${p.id}/edit`} />}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Empreendimentos */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Empreendimentos</h2>

        {/* Mobile */}
        <div className="sm:hidden space-y-2">
          {devList.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum empreendimento cadastrado.</p>
          )}
          {devList.map(({ dev: d, tenantName }) => (
            <div key={d.id} className="border rounded-xl p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.city}</p>
                </div>
                <Badge variant={STATUS_VARIANT[d.status]} className="shrink-0 text-xs">{STATUS_LABELS[d.status]}</Badge>
              </div>
              {(d.minPrice || tenantName) && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {d.minPrice && d.maxPrice && (
                    <span className="font-medium text-green-700">
                      {Number(d.minPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} – {Number(d.maxPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  )}
                  {tenantName && <span>🏢 {tenantName}</span>}
                </div>
              )}
              <div className="pt-1 border-t">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" nativeButton={false} render={<Link href={`/properties/developments/${d.id}/edit`} />}>
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Faixa de valor</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {devList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum empreendimento cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {devList.map(({ dev: d, tenantName }) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.city}</TableCell>
                  <TableCell className="text-sm">
                    {d.minPrice && d.maxPrice
                      ? `${Number(d.minPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} – ${Number(d.maxPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tenantName ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[d.status]}>{STATUS_LABELS[d.status]}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/properties/developments/${d.id}/edit`} />}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
