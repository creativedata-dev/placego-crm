import { db } from "@/db";
import { leads, sdrAssignments, properties, tenants, users, tags, contactTags, leadAssignments, contactMessages } from "@/db/schema";
import { eq, desc, inArray, isNull, and, count, sql } from "drizzle-orm";
import { SdrKanbanBoard } from "./sdr-kanban-board";
import { STATUS_COLUMNS } from "./page";

interface Props {
  isAdmin: boolean;
  targetSdrId: string | null;
  origin?: string;
  tenantFilter?: string;
  tagFilter?: string;
  brokerFilter?: string;
}

export async function KanbanData({ isAdmin, targetSdrId, origin, tenantFilter, tagFilter, brokerFilter }: Props) {
  const rows = await db
    .select({
      assignment: sdrAssignments,
      contact: leads,
      propertyAddress: properties.address,
      propertyNeighborhood: properties.neighborhood,
      tenantName: tenants.name,
      sdrName: users.name,
    })
    .from(sdrAssignments)
    .innerJoin(leads, eq(sdrAssignments.contactId, leads.id))
    .leftJoin(properties, eq(leads.sourcePropertyId, properties.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
    .where(targetSdrId ? eq(sdrAssignments.sdrId, targetSdrId) : undefined)
    .orderBy(desc(sql`COALESCE(${sdrAssignments.lastInteractionAt}, ${sdrAssignments.assignedAt})`));

  const contactIds = rows.map((r) => r.contact.id);

  const [unreadRows, tagRows] = await Promise.all([
    contactIds.length > 0
      ? db
          .select({ contactId: contactMessages.contactId, cnt: count() })
          .from(contactMessages)
          .where(and(
            inArray(contactMessages.contactId, contactIds),
            eq(contactMessages.direction, "in"),
            isNull(contactMessages.readAt),
          ))
          .groupBy(contactMessages.contactId)
      : [],
    contactIds.length > 0
      ? db
          .select({ contactId: contactTags.contactId, tag: tags })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(inArray(contactTags.contactId, contactIds))
      : [],
  ]);

  const unreadByContact = new Map(unreadRows.map((r) => [r.contactId, Number(r.cnt)]));

  const tagsByContact = new Map<string, typeof tagRows[number]["tag"][]>();
  for (const row of tagRows) {
    const list = tagsByContact.get(row.contactId) ?? [];
    list.push(row.tag);
    tagsByContact.set(row.contactId, list);
  }

  const distributedIds = rows
    .filter((r) => r.assignment.status === "distribuido")
    .map((r) => r.contact.id);

  const brokerRows = distributedIds.length > 0
    ? await db
        .select({ leadId: leadAssignments.leadId, brokerId: users.id, brokerName: users.name })
        .from(leadAssignments)
        .innerJoin(users, eq(leadAssignments.brokerId, users.id))
        .where(and(
          inArray(leadAssignments.leadId, distributedIds),
          inArray(leadAssignments.status, ["new", "contacted", "visiting", "proposal"]),
        ))
    : [];

  const brokersByContact = new Map<string, { id: string; name: string }[]>();
  for (const row of brokerRows) {
    const list = brokersByContact.get(row.leadId) ?? [];
    if (!list.find((b) => b.id === row.brokerId)) {
      list.push({ id: row.brokerId, name: row.brokerName });
    }
    brokersByContact.set(row.leadId, list);
  }

  const filtered = rows.filter((r) => {
    if (origin && r.contact.origin !== origin) return false;
    if (tenantFilter && r.contact.tenantId !== tenantFilter) return false;
    if (tagFilter && !(tagsByContact.get(r.contact.id) ?? []).some((t) => t.id === tagFilter)) return false;
    if (brokerFilter && !(brokersByContact.get(r.contact.id) ?? []).some((b) => b.id === brokerFilter)) return false;
    return true;
  });

  const columns = STATUS_COLUMNS.map((col) => ({
    ...col,
    cards: filtered
      .filter((r) => r.assignment.status === col.id)
      .map((r) => ({
        ...r,
        tags: tagsByContact.get(r.contact.id) ?? [],
        brokerNames: (brokersByContact.get(r.contact.id) ?? []).map((b) => b.name),
        unreadCount: unreadByContact.get(r.contact.id) ?? 0,
      })),
  }));

  return <SdrKanbanBoard columns={columns} isAdmin={isAdmin} />;
}
