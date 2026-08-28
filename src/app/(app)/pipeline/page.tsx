import { Suspense } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { inArray, and, eq } from "drizzle-orm";
import { PipelineBrokerFilter } from "./pipeline-broker-filter";
import { PipelineData } from "./pipeline-data";
import Loading from "./loading";

export const COLUMNS = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "contacted", label: "Em Contato", color: "bg-yellow-500" },
  { id: "visiting", label: "Visita Agendada", color: "bg-purple-500" },
  { id: "proposal", label: "Em negociação", color: "bg-orange-500" },
  { id: "won", label: "Vendido", color: "bg-green-500" },
  { id: "lost", label: "Perdido", color: "bg-red-400" },
] as const;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ broker?: string }>;
}) {
  const user = await requireRole(["corretor", "corretor_tenant", "admin_placego", "sdr", "admin_tenant", "gestor_imobiliaria"]);
  const { broker: brokerFilter } = await searchParams;

  const isAdmin = user.role === "admin_placego" || user.role === "sdr" || user.role === "admin_tenant";
  const isGestor = user.role === "gestor_imobiliaria";

  // gestor_imobiliaria vê os corretores do seu tenant
  const brokerList = isAdmin || isGestor
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(
          user.role === "admin_tenant" && user.tenantId
            ? and(inArray(users.role, ["corretor", "corretor_tenant"]), eq(users.tenantId, user.tenantId))
            : isGestor && user.tenantId
            ? and(inArray(users.role, ["corretor", "corretor_tenant"]), eq(users.tenantId, user.tenantId))
            : inArray(users.role, ["corretor", "corretor_tenant"])
        )
        .orderBy(users.name)
    : [];

  return (
    <div className="space-y-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Visão dos corretores" : "Seus leads em atendimento"}
          </p>
        </div>
        {(isAdmin || isGestor) && <PipelineBrokerFilter brokers={brokerList} selected={brokerFilter ?? ""} />}
      </div>
      <Suspense fallback={<Loading />}>
        <PipelineData
          isAdmin={isAdmin || isGestor}
          userId={user.id}
          brokerFilter={brokerFilter}
          tenantId={
            user.role === "admin_tenant" || isGestor
              ? (user.tenantId ?? undefined)
              : undefined
          }
        />
      </Suspense>
    </div>
  );
}
