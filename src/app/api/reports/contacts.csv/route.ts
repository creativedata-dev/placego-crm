import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, sdrAssignments, users, tenants, tags, contactTags, leadAssignments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

const ORIGIN_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  meta_leadgen: "Meta Lead Gen",
  meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM",
  meta_comment: "Comentário",
  whatsapp: "WhatsApp",
  email: "Email",
  lp: "Landing Page",
  indicacao: "Indicação",
  manual: "Manual",
  portal: "Portal",
};

const SDR_STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  aguardando: "Aguardando",
  qualificado: "Qualificado",
  distribuido: "Distribuído",
  invalido: "Inválido",
  arquivado: "Arquivado",
};

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Em contato",
  visiting: "Visita",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

function esc(v: string | null | undefined): string {
  if (!v) return "";
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: NextRequest) {
  await requireRole(["admin_placego", "sdr"]);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const originFilter = searchParams.get("origin") ?? "";
  const tenantFilter = searchParams.get("tenant") ?? "";
  const sdrFilter = searchParams.get("sdr") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const stageFilter = searchParams.get("stage") ?? "";

  const rows = await db
    .select({
      lead: leads,
      tenantName: tenants.name,
      sdrName: users.name,
      sdrStatus: sdrAssignments.status,
    })
    .from(leads)
    .leftJoin(sdrAssignments, eq(sdrAssignments.contactId, leads.id))
    .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .orderBy(desc(leads.createdAt));

  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.lead.id)) return false;
    seen.add(r.lead.id);
    return true;
  });

  const leadIds = deduped.map((r) => r.lead.id);

  const tagRows = leadIds.length > 0
    ? await db.select({ contactId: contactTags.contactId, tag: tags }).from(contactTags).innerJoin(tags, eq(contactTags.tagId, tags.id))
    : [];

  const tagsByLead = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = tagsByLead.get(row.contactId) ?? [];
    list.push(row.tag.name);
    tagsByLead.set(row.contactId, list);
  }

  const pipelineRows = leadIds.length > 0
    ? await db
        .select({ leadId: leadAssignments.leadId, status: leadAssignments.status, brokerName: users.name })
        .from(leadAssignments)
        .innerJoin(users, eq(leadAssignments.brokerId, users.id))
        .orderBy(desc(leadAssignments.assignedAt))
    : [];

  const pipelineByLead = new Map<string, { status: string; brokerName: string }>();
  for (const r of pipelineRows) {
    if (!pipelineByLead.has(r.leadId)) pipelineByLead.set(r.leadId, { status: r.status, brokerName: r.brokerName });
  }

  const fmt = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "";

  const all = deduped.map((r) => {
    const pipeline = pipelineByLead.get(r.lead.id);
    return {
      name: r.lead.name,
      phone: r.lead.phone ?? "",
      email: r.lead.email ?? "",
      tenant: r.tenantName ?? "",
      origin: ORIGIN_LABELS[r.lead.origin] ?? r.lead.origin,
      stage: r.lead.stage === "lead" ? "Lead" : "Contato",
      sdr: r.sdrName ?? "",
      sdrStatus: r.sdrStatus ? (SDR_STATUS_LABELS[r.sdrStatus] ?? r.sdrStatus) : "",
      pipelineStatus: pipeline ? (PIPELINE_STATUS_LABELS[pipeline.status] ?? pipeline.status) : "",
      broker: pipeline?.brokerName ?? "",
      score: String(r.lead.qualityScore ?? 0),
      tags: (tagsByLead.get(r.lead.id) ?? []).join("; "),
      createdAt: fmt(r.lead.createdAt),
      qualifiedAt: fmt(r.lead.qualifiedAt),
    };
  }).filter((c) => {
    if (search && !c.name.toLowerCase().includes(search) && !c.phone.includes(search) && !c.email.toLowerCase().includes(search)) return false;
    if (originFilter && c.origin !== (ORIGIN_LABELS[originFilter] ?? originFilter)) return false;
    if (tenantFilter && c.tenant !== tenantFilter) return false;
    if (sdrFilter && c.sdr !== sdrFilter) return false;
    if (statusFilter && c.sdrStatus !== (SDR_STATUS_LABELS[statusFilter] ?? statusFilter)) return false;
    if (stageFilter && c.stage.toLowerCase() !== stageFilter) return false;
    return true;
  });

  const header = "Nome,Telefone,Email,Empresa,Origem,Fase,SDR,Status SDR,Pipeline,Corretor,Score,Tags,Criado em,Qualificado em";
  const csvRows = all.map((c) =>
    [c.name, c.phone, c.email, c.tenant, c.origin, c.stage, c.sdr, c.sdrStatus, c.pipelineStatus, c.broker, c.score, c.tags, c.createdAt, c.qualifiedAt]
      .map(esc)
      .join(",")
  );

  const csv = [header, ...csvRows].join("\n");
  const bom = "﻿";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
