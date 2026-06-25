import { db } from "@/db";
import { users, brokerPreferences, leads, properties, developments } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export interface BrokerMatch {
  brokerId: string;
  brokerName: string;
  brokerEmail: string;
  brokerPhone: string | null;
  tenantName: string | null;
  creci: string | null;
  score: number;
  reasons: string[];
}

export async function scoreBrokersForLead(leadId: string): Promise<BrokerMatch[]> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return [];

  // Buscar imóvel/empreendimento de origem
  let propertyCity: string | null = null;
  let propertyNeighborhood: string | null = null;
  let propertyPrice: number | null = null;
  let propertyType: string | null = null;

  if (lead.sourcePropertyId) {
    const [prop] = await db.select().from(properties).where(eq(properties.id, lead.sourcePropertyId)).limit(1);
    if (prop) {
      propertyCity = prop.city;
      propertyNeighborhood = prop.neighborhood;
      propertyPrice = prop.price ? Number(prop.price) : null;
      propertyType = prop.type;
    }
  } else if (lead.sourceDevelopmentId) {
    const [dev] = await db.select().from(developments).where(eq(developments.id, lead.sourceDevelopmentId)).limit(1);
    if (dev) {
      propertyCity = dev.city;
      propertyPrice = dev.minPrice ? Number(dev.minPrice) : null;
    }
  }

  // Buscar todos os corretores ativos com preferências
  const brokerRows = await db
    .select({
      user: users,
      prefs: brokerPreferences,
    })
    .from(users)
    .leftJoin(brokerPreferences, eq(users.id, brokerPreferences.brokerId))
    .where(inArray(users.role, ["corretor", "corretor_tenant"]));

  // Importar tenants para nome
  const { tenants } = await import("@/db/schema");
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);
  const tenantMap = Object.fromEntries(tenantRows.map((t) => [t.id, t.name]));

  const matches: BrokerMatch[] = brokerRows.map(({ user, prefs }) => {
    let score = 0;
    const reasons: string[] = [];

    if (prefs) {
      // Cidade (+35)
      if (propertyCity && prefs.cities && prefs.cities.length > 0) {
        const cityMatch = prefs.cities.some(
          (c) => c.toLowerCase() === propertyCity!.toLowerCase()
        );
        if (cityMatch) {
          score += 35;
          reasons.push(`Atua em ${propertyCity}`);
        }
      }

      // Bairro (+20)
      if (propertyNeighborhood && prefs.neighborhoods && prefs.neighborhoods.length > 0) {
        const neighMatch = prefs.neighborhoods.some(
          (n) => n.toLowerCase() === propertyNeighborhood!.toLowerCase()
        );
        if (neighMatch) {
          score += 20;
          reasons.push(`Atua no bairro ${propertyNeighborhood}`);
        }
      }

      // Faixa de valor (+25)
      if (propertyPrice !== null) {
        const min = prefs.minPrice ? Number(prefs.minPrice) : null;
        const max = prefs.maxPrice ? Number(prefs.maxPrice) : null;
        const inRange =
          (min === null || propertyPrice >= min) &&
          (max === null || propertyPrice <= max);
        if (inRange && (min !== null || max !== null)) {
          score += 25;
          reasons.push("Faixa de valor compatível");
        }
      }

      // Tipo de imóvel (+20)
      if (propertyType && prefs.propertyTypes && prefs.propertyTypes.length > 0) {
        if (prefs.propertyTypes.includes(propertyType)) {
          score += 20;
          reasons.push(`Especialista em ${propertyType}`);
        }
      }
    }

    if (reasons.length === 0) reasons.push("Sem critérios de afinidade cadastrados");

    return {
      brokerId: user.id,
      brokerName: user.name,
      brokerEmail: user.email,
      brokerPhone: user.phone,
      tenantName: user.tenantId ? (tenantMap[user.tenantId] ?? null) : null,
      creci: prefs?.creci ?? null,
      score,
      reasons,
    };
  });

  return matches.sort((a, b) => b.score - a.score);
}
