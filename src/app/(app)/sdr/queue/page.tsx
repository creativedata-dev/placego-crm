import { Suspense } from "react";
import { db } from "@/db";
import { tenants, users, tags } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import { QueueFilters } from "./queue-filters";
import { AddContactButton } from "./add-contact-button";
import { AutoRefresh } from "./auto-refresh";
import { KanbanData } from "./kanban-data";
import Loading from "./loading";

export const STATUS_COLUMNS = [
  { id: "novo", label: "Novos", color: "bg-blue-500" },
  { id: "em_contato", label: "Em contato", color: "bg-yellow-500" },
  { id: "aguardando", label: "Aguardando", color: "bg-orange-400" },
  { id: "qualificado", label: "Qualificado", color: "bg-green-500" },
  { id: "distribuido", label: "Distribuído", color: "bg-purple-500" },
  { id: "invalido", label: "Inválido", color: "bg-red-400" },
  { id: "arquivado", label: "Arquivados", color: "bg-gray-400" },
] as const;

export default async function SDRQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; tenant?: string; sdr?: string; tag?: string; broker?: string }>;
}) {
  const user = await requireRole(["sdr", "admin_placego"]);
  const { origin, tenant: tenantFilter, sdr: sdrFilter, tag: tagFilter, broker: brokerFilter } = await searchParams;

  const isAdmin = user.role === "admin_placego";
  const targetSdrId = isAdmin ? (sdrFilter ?? null) : user.id;

  // Dados leves para filtros e header (rápidos)
  const [tenantList, sdrList, tagList, brokerList] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
    isAdmin
      ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "sdr"))
      : Promise.resolve([]),
    db.select().from(tags).orderBy(tags.name),
    db.select({ id: users.id, name: users.name }).from(users)
      .where(inArray(users.role, ["corretor", "corretor_tenant"])),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? "Fila SDR — Visão geral" : "Minha fila"}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-muted-foreground text-sm">
              {isAdmin ? "Todos os contatos de todos os SDRs" : "Seus contatos"}
            </p>
            <AutoRefresh />
          </div>
        </div>
        <AddContactButton tenants={tenantList} />
      </div>

      <QueueFilters
        currentOrigin={origin}
        currentTenant={tenantFilter}
        currentSdr={sdrFilter}
        currentTag={tagFilter}
        currentBroker={brokerFilter}
        tenants={tenantList}
        sdrs={sdrList}
        tagsList={tagList}
        brokers={brokerList}
        isAdmin={isAdmin}
      />

      <Suspense fallback={<Loading />}>
        <KanbanData
          isAdmin={isAdmin}
          targetSdrId={targetSdrId}
          origin={origin}
          tenantFilter={tenantFilter}
          tagFilter={tagFilter}
          brokerFilter={brokerFilter}
        />
      </Suspense>
    </div>
  );
}
