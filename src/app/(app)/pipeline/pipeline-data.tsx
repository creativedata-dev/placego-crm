import { db } from "@/db";
import { leadAssignments, leads, users, tags, contactTags, tenants } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { KanbanBoard } from "./kanban-board";
import { COLUMNS } from "./page";

interface Props {
  isAdmin: boolean;
  userId: string;
  brokerFilter?: string;
}

export async function PipelineData({ isAdmin, userId, brokerFilter }: Props) {
  const whereClause = isAdmin
    ? brokerFilter
      ? eq(leadAssignments.brokerId, brokerFilter)
      : undefined
    : eq(leadAssignments.brokerId, userId);

  const rows = await db
    .select({
      assignment: leadAssignments,
      lead: leads,
      brokerName: users.name,
      tenantName: tenants.name,
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .innerJoin(users, eq(leadAssignments.brokerId, users.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .where(whereClause)
    .orderBy(leadAssignments.assignedAt);

  const leadIds = rows.map((r) => r.lead.id);
  const tagRows = leadIds.length > 0
    ? await db
        .select({ contactId: contactTags.contactId, tag: tags })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(inArray(contactTags.contactId, leadIds))
    : [];

  const tagsByLead = new Map<string, typeof tagRows[number]["tag"][]>();
  for (const row of tagRows) {
    const list = tagsByLead.get(row.contactId) ?? [];
    list.push(row.tag);
    tagsByLead.set(row.contactId, list);
  }

  const columns = COLUMNS.map((col) => ({
    ...col,
    cards: rows
      .filter((r) => r.assignment.status === col.id)
      .map((r) => ({ ...r, tags: tagsByLead.get(r.lead.id) ?? [], tenantName: r.tenantName })),
  }));

  return <KanbanBoard columns={columns} isAdmin={isAdmin} />;
}
