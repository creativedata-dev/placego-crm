import { db } from "@/db";
import { leads, sdrAssignments, users, tenants, tags, contactTags, leadAssignments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ContactsTable } from "./contacts-table";

export default async function ContatosPage() {
  const currentUser = await requireRole(["admin_placego", "sdr", "admin_tenant"]);

  // SDR e admin_tenant só veem contatos do seu próprio tenant
  const tenantFilter = (currentUser.role === "sdr" || currentUser.role === "admin_tenant") && currentUser.tenantId
    ? eq(leads.tenantId, currentUser.tenantId)
    : undefined;

  const rows = await db
    .select({
      lead: leads,
      tenantName: tenants.name,
      sdrName: users.name,
      sdrStatus: sdrAssignments.status,
      sdrUpdatedAt: sdrAssignments.updatedAt,
    })
    .from(leads)
    .leftJoin(sdrAssignments, eq(sdrAssignments.contactId, leads.id))
    .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .where(tenantFilter)
    .orderBy(desc(leads.createdAt));

  // Deduplicar por lead.id — pegar o assignment mais recente
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.lead.id)) return false;
    seen.add(r.lead.id);
    return true;
  });

  // Buscar tags
  const leadIds = deduped.map((r) => r.lead.id);
  const tagRows = leadIds.length > 0
    ? await db
        .select({ contactId: contactTags.contactId, tag: tags })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
    : [];

  const tagsByLead = new Map<string, { id: string; name: string; color: string }[]>();
  for (const row of tagRows) {
    const list = tagsByLead.get(row.contactId) ?? [];
    list.push(row.tag);
    tagsByLead.set(row.contactId, list);
  }

  // Buscar status do pipeline (corretor) mais recente por lead
  const pipelineRows = leadIds.length > 0
    ? await db
        .select({ leadId: leadAssignments.leadId, status: leadAssignments.status, brokerName: users.name })
        .from(leadAssignments)
        .innerJoin(users, eq(leadAssignments.brokerId, users.id))
        .orderBy(desc(leadAssignments.assignedAt))
    : [];

  const pipelineByLead = new Map<string, { status: string; brokerName: string }>();
  for (const r of pipelineRows) {
    if (!pipelineByLead.has(r.leadId)) {
      pipelineByLead.set(r.leadId, { status: r.status, brokerName: r.brokerName });
    }
  }

  const contacts = deduped.map((r) => ({
    id: r.lead.id,
    name: r.lead.name,
    phone: r.lead.phone,
    email: r.lead.email,
    city: r.lead.city,
    state: r.lead.state,
    origin: r.lead.origin,
    stage: r.lead.stage,
    qualityScore: r.lead.qualityScore,
    createdAt: r.lead.createdAt,
    qualifiedAt: r.lead.qualifiedAt,
    tenantName: r.tenantName,
    sdrName: r.sdrName,
    sdrStatus: r.sdrStatus,
    pipelineStatus: pipelineByLead.get(r.lead.id)?.status ?? null,
    brokerName: pipelineByLead.get(r.lead.id)?.brokerName ?? null,
    tags: tagsByLead.get(r.lead.id) ?? [],
  }));

  // Listas para filtros — SDR só vê seu próprio tenant/SDRs do mesmo tenant
  const tenantList = currentUser.role === "admin_placego"
    ? await db.select({ id: tenants.id, name: tenants.name }).from(tenants)
    : [];

  const sdrList = currentUser.role === "admin_placego"
    ? await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "sdr"))
    : currentUser.role === "sdr" && currentUser.tenantId
    ? await db.select({ id: users.id, name: users.name }).from(users)
        .where(and(eq(users.role, "sdr"), eq(users.tenantId, currentUser.tenantId)))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground text-sm">{contacts.length} contatos no total</p>
        </div>
      </div>
      <ContactsTable contacts={contacts} tenants={tenantList} sdrs={sdrList} />
    </div>
  );
}
