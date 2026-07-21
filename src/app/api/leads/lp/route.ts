import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, tenants } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { assignContactToNextSdr } from "@/lib/round-robin";

/**
 * POST /api/leads/lp?token=<webhook_token_da_empresa>
 *
 * Payload esperado (JSON):
 * {
 *   "name": "João Silva",          // obrigatório
 *   "phone": "11999999999",        // obrigatório (ou email)
 *   "email": "joao@email.com",     // opcional
 *   "source": "lp-nome-pagina",    // opcional — salvo em form_name
 *   "campaign": "google-ads-julho" // opcional — salvo em utm_campaign
 * }
 *
 * Resposta de sucesso: { "ok": true, "created": true | false }
 * created=false significa lead duplicado (mesmo telefone/email nos últimos 30 dias)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
    }

    // Resolver empresa pelo token
    const [tenant] = await db
      .select({ id: tenants.id, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.webhookToken, token))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const body = await request.json();

    const name = (body.name as string | undefined)?.trim() || "Sem nome";
    const phone = (body.phone as string | undefined)?.replace(/\D/g, "") || null;
    const email = (body.email as string | undefined)?.trim().toLowerCase() || null;
    const source = (body.source as string | undefined)?.trim() || null;
    const campaign = (body.campaign as string | undefined)?.trim() || null;
    const utmSource = (body.utm_source as string | undefined)?.trim() || null;
    const utmMedium = (body.utm_medium as string | undefined)?.trim() || null;

    if (!phone && !email) {
      return NextResponse.json({ error: "Telefone ou email obrigatório" }, { status: 400 });
    }

    // Deduplicação: mesmo telefone/email nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dedupeConditions = [];
    if (phone) dedupeConditions.push(eq(leads.phone, phone));
    if (email) dedupeConditions.push(eq(leads.email, email));

    const [duplicate] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(or(...dedupeConditions), gte(leads.createdAt, thirtyDaysAgo)))
      .limit(1);

    // Score de qualidade
    let score = 0;
    if (name && name !== "Sem nome") score += 20;
    if (phone) score += 30;
    if (email) score += 20;
    if (campaign || utmSource) score += 15;
    score += 15; // origem LP sempre identificada

    const [contact] = await db
      .insert(leads)
      .values({
        name,
        phone,
        email,
        tenantId: tenant.id,
        stage: "contato",
        origin: "lp",
        formName: source,
        utmCampaign: campaign,
        utmSource,
        utmMedium,
        status: duplicate ? "duplicate" : "new",
        qualityScore: score,
      })
      .returning();

    if (!duplicate && contact) {
      await assignContactToNextSdr(contact.id, tenant.id);
    }

    return NextResponse.json({ ok: true, created: !duplicate });
  } catch (err) {
    console.error("[leads/lp]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
