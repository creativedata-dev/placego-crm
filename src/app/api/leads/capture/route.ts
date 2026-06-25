import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, properties, developments, tenants } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";

// Verificação do webhook Meta (GET) — por token de tenant
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new Response("Bad Request", { status: 400 });
  }

  // Aceita tanto o token global (PlaceGo) quanto tokens de tenant
  const isGlobal = token === process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!isGlobal) {
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.webhookToken, token))
      .limit(1);
    if (!tenant) return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, { status: 200 });
}

// Recebimento de leads (POST)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incomingToken = searchParams.get("token");

    // Resolver tenant pelo token da URL
    let tenantId: string | null = null;
    if (incomingToken) {
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.webhookToken, incomingToken))
        .limit(1);
      if (!tenant) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      tenantId = tenant.id;
    }

    const body = await request.json();
    const entries = body.entry ?? [body];

    for (const entry of entries) {
      const changes = entry.changes ?? [{ value: entry }];

      for (const change of changes) {
        const value = change.value ?? change;
        const fieldData: { name: string; values: string[] }[] =
          value.field_data ?? [];

        const get = (key: string) =>
          fieldData.find((f) => f.name === key)?.values?.[0] ?? null;

        const name =
          get("full_name") ?? get("nome") ?? value.name ?? "Sem nome";
        const phone =
          get("phone_number") ?? get("telefone") ?? get("whatsapp") ?? value.phone ?? "";
        const email = get("email") ?? value.email ?? null;
        const campaignId =
          value.campaign_id?.toString() ?? value.ad_id?.toString() ?? null;

        if (!phone) continue;

        // Deduplicação: mesmo telefone/email nos últimos 30 dias
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const conditions = [];
        if (phone) conditions.push(eq(leads.phone, phone));
        if (email) conditions.push(eq(leads.email, email));

        const [duplicate] = await db
          .select({ id: leads.id })
          .from(leads)
          .where(and(or(...conditions), gte(leads.createdAt, thirtyDaysAgo)))
          .limit(1);

        // Score de qualidade
        let score = 0;
        if (name && name !== "Sem nome") score += 20;
        if (phone) score += 30;
        if (email) score += 20;
        if (campaignId) score += 15;
        if (value.utm_source) score += 15;

        // Resolver imóvel de origem pelo external_id
        let sourcePropertyId: string | null = null;
        let sourceDevelopmentId: string | null = null;

        if (value.property_id) {
          const [prop] = await db
            .select({ id: properties.id })
            .from(properties)
            .where(eq(properties.externalId, value.property_id))
            .limit(1);
          if (prop) sourcePropertyId = prop.id;
        }

        await db.insert(leads).values({
          name,
          phone,
          email,
          sourcePropertyId,
          sourceDevelopmentId,
          origin: "meta_ads",
          campaignId,
          utmSource: value.utm_source ?? null,
          utmMedium: value.utm_medium ?? null,
          utmCampaign: value.utm_campaign ?? null,
          status: duplicate ? "duplicate" : "new",
          qualityScore: score,
          // tenantId não está no schema de leads ainda — guardamos via imóvel de origem
          // ou podemos adicionar no futuro; por ora o SDR vê todos e filtra por imóvel
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/leads]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
