import Link from "next/link";
import { db } from "@/db";
import { tenants } from "@/db/schema";
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
import { DeleteTenantButton } from "./delete-button";

const TYPE_LABELS: Record<string, string> = {
  imobiliaria: "Imobiliária",
  incorporadora: "Incorporadora",
  construtora: "Construtora",
  corretor: "Corretor Autônomo",
};

export default async function TenantsPage() {
  await requireRole(["admin_placego"]);

  const list = await db.select().from(tenants).orderBy(tenants.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground text-sm">
            Imobiliárias, incorporadoras e corretores parceiros
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/tenants/new" />}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {list.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma empresa cadastrada.</p>
        )}
        {list.map((t) => (
          <div key={t.id} className="border rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{TYPE_LABELS[t.type] ?? t.type}</Badge>
            </div>
            <div className="flex gap-1 pt-1 border-t flex-wrap">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" nativeButton={false} render={<Link href={`/tenants/${t.id}/channels`} />}>
                Conectores
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" nativeButton={false} render={<Link href={`/tenants/${t.id}/edit`} />}>
                Editar
              </Button>
              <DeleteTenantButton id={t.id} name={t.name} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma empresa cadastrada.
                </TableCell>
              </TableRow>
            )}
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">{t.slug}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/tenants/${t.id}/channels`} />}>
                      Conectores
                    </Button>
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/tenants/${t.id}/edit`} />}>
                      Editar
                    </Button>
                    <DeleteTenantButton id={t.id} name={t.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
