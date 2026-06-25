import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { randomBytes } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });
const db = drizzle(sql, { schema });

// ─── helpers ────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function token() { return randomBytes(24).toString("hex"); }

async function createAuthUser(email: string, name: string) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "PlaceGo@2026",
    email_confirm: true,
  });
  if (error) throw new Error(`Auth error for ${email}: ${error.message}`);
  return data.user!.id;
}

// ─── dados de referência ────────────────────────────────────────────────────
const TENANT_DATA = [
  { name: "Imóveis Lisboa", type: "imobiliaria" as const, slug: "imoveis-lisboa", city: "São Paulo", neighborhoods: ["Moema", "Itaim Bibi", "Vila Olímpia"] },
  { name: "Construtora Horizonte", type: "construtora" as const, slug: "construtora-horizonte", city: "Campinas", neighborhoods: ["Cambuí", "Taquaral", "Jardim Proença"] },
  { name: "Incorporadora Nobre", type: "incorporadora" as const, slug: "incorporadora-nobre", city: "São Paulo", neighborhoods: ["Brooklin", "Campo Belo", "Santo André"] },
];

const BROKER_DATA = [
  { name: "Carlos Menezes", email: "carlos.menezes@demo.placego.com.br", role: "corretor" as const, cities: ["São Paulo"], neighborhoods: ["Moema", "Itaim Bibi"], minPrice: 400000, maxPrice: 1500000, types: ["apartamento", "cobertura"] },
  { name: "Fernanda Souza", email: "fernanda.souza@demo.placego.com.br", role: "corretor" as const, cities: ["São Paulo"], neighborhoods: ["Vila Olímpia", "Brooklin"], minPrice: 600000, maxPrice: 2000000, types: ["apartamento", "studio"] },
  { name: "Ricardo Alves", email: "ricardo.alves@demo.placego.com.br", role: "corretor_tenant" as const, cities: ["Campinas"], neighborhoods: ["Cambuí", "Taquaral"], minPrice: 300000, maxPrice: 900000, types: ["apartamento", "casa"] },
  { name: "Juliana Costa", email: "juliana.costa@demo.placego.com.br", role: "corretor_tenant" as const, cities: ["São Paulo"], neighborhoods: ["Campo Belo", "Santo André"], minPrice: 500000, maxPrice: 1800000, types: ["apartamento", "cobertura", "studio"] },
  { name: "Marcos Oliveira", email: "marcos.oliveira@demo.placego.com.br", role: "corretor" as const, cities: ["São Paulo", "Campinas"], neighborhoods: ["Moema", "Cambuí"], minPrice: 250000, maxPrice: 800000, types: ["casa", "terreno", "comercial"] },
];

const SDR_DATA = [
  { name: "Amanda SDR", email: "amanda.sdr@demo.placego.com.br", role: "sdr" as const },
];

const LEAD_NAMES = ["João Silva", "Maria Oliveira", "Pedro Santos", "Ana Lima", "Carlos Pereira", "Fernanda Costa", "Lucas Rodrigues", "Beatriz Alves", "Rafael Nascimento", "Camila Ferreira", "Thiago Martins", "Larissa Souza", "Gustavo Barbosa", "Patrícia Moreira", "Felipe Carvalho", "Isabela Gomes", "Diego Melo", "Vanessa Ribeiro", "André Cavalcanti", "Juliana Teixeira"];

const CAMPAIGNS = [
  { id: "23849123456", name: "Lançamento Jardins Premium", adset: "Interesse Decoração", form: "Form Jardins Q2" },
  { id: "23849789012", name: "Moema Últimas Unidades", adset: "Retargeting Visitantes", form: "Form Moema Rápido" },
  { id: "23849345678", name: "Studio Compacto SP", adset: "Jovens 25-35", form: "Form Studio Simples" },
  { id: "23849901234", name: "Casa Campinas Premium", adset: "Famílias Campinas", form: "Form Casa Família" },
];

const LOSS_REASONS = [
  "Cliente comprou com outro corretor",
  "Saiu do budget — imóvel acima do valor",
  "Mudou de cidade",
  "Perdeu interesse no mercado",
  "Não atende mais o telefone",
  "Comprou imóvel menor por conta própria",
];

const ACTIVITY_NOTES = {
  call: ["Atendeu, tem interesse, vai pensar", "Não atendeu — tentativa 1", "Confirmou visita para semana que vem", "Pediu para ligar após às 18h"],
  whatsapp: ["Enviou mensagem, aguardando retorno", "Confirmou interesse por WhatsApp", "Enviou fotos pedidas", "Cliente respondeu querendo mais detalhes"],
  visit: ["Visita realizada, gostou muito do imóvel", "Visita cancelada, reagendando", "Segunda visita com cônjuge marcada"],
  note: ["Cliente tem restrição no SPC, verificar", "Prefere andar alto com vista", "Tem entrada de R$ 200k disponível"],
};

// ─── seed principal ──────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Iniciando seed de dados demo...\n");

  // 1. Tenants
  console.log("📦 Criando tenants...");
  const createdTenants: { id: string; tenantData: typeof TENANT_DATA[0] }[] = [];
  for (const t of TENANT_DATA) {
    const [existing] = await db.select().from(schema.tenants).where(
      // @ts-ignore
      (tbl: any) => tbl.slug.eq ? undefined : undefined
    ).limit(1).catch(() => [null]);

    const [inserted] = await db.insert(schema.tenants).values({
      name: t.name,
      type: t.type,
      slug: t.slug,
      webhookToken: token(),
    }).onConflictDoUpdate({
      target: schema.tenants.slug,
      set: { name: t.name, type: t.type },
    }).returning();
    createdTenants.push({ id: inserted.id, tenantData: t });
    console.log(`  ✓ ${t.name}`);
  }

  // 2. SDR
  console.log("\n👤 Criando SDR...");
  const sdrIds: string[] = [];
  for (const s of SDR_DATA) {
    const authId = await createAuthUser(s.email, s.name);
    await db.insert(schema.users).values({ id: authId, email: s.email, name: s.name, role: s.role })
      .onConflictDoNothing();
    sdrIds.push(authId);
    console.log(`  ✓ ${s.name}`);
  }

  // 3. Corretores
  console.log("\n🏡 Criando corretores...");
  const brokerIds: { id: string; tenantId: string | null }[] = [];
  for (let i = 0; i < BROKER_DATA.length; i++) {
    const b = BROKER_DATA[i];
    const tenantId = b.role === "corretor_tenant"
      ? createdTenants[i % createdTenants.length].id
      : null;
    const authId = await createAuthUser(b.email, b.name);
    await db.insert(schema.users).values({ id: authId, email: b.email, name: b.name, role: b.role, tenantId })
      .onConflictDoNothing();
    await db.insert(schema.brokerPreferences).values({
      brokerId: authId,
      cities: b.cities,
      neighborhoods: b.neighborhoods,
      minPrice: String(b.minPrice),
      maxPrice: String(b.maxPrice),
      propertyTypes: b.types,
      creci: `CRECI-SP ${rand(10000, 99999)}`,
    }).onConflictDoUpdate({
      target: schema.brokerPreferences.brokerId,
      set: { cities: b.cities, neighborhoods: b.neighborhoods },
    });
    brokerIds.push({ id: authId, tenantId });
    console.log(`  ✓ ${b.name}`);
  }

  // 4. Imóveis
  console.log("\n🏢 Criando imóveis...");
  const propertyIds: { id: string; tenantId: string }[] = [];
  for (const { id: tenantId, tenantData } of createdTenants) {
    for (let i = 0; i < 3; i++) {
      const type = pick(["apartamento", "casa", "studio", "cobertura"] as const);
      const price = rand(350, 1800) * 1000;
      const [prop] = await db.insert(schema.properties).values({
        tenantId,
        type,
        address: `Rua ${pick(["das Flores", "Paulista", "Augusta", "Oscar Freire", "dos Pinheiros"])} ${rand(100, 999)}`,
        neighborhood: pick(tenantData.neighborhoods),
        city: tenantData.city,
        price: String(price),
        areaM2: String(rand(40, 200)),
        bedrooms: rand(1, 4),
        suites: rand(0, 2),
        parkingSpots: rand(1, 3),
      }).returning();
      propertyIds.push({ id: prop.id, tenantId });
    }
  }
  console.log(`  ✓ ${propertyIds.length} imóveis criados`);

  // 5. Leads (mistura de status)
  console.log("\n📋 Criando leads...");
  const leadIds: string[] = [];
  const statuses = ["new", "new", "new", "waiting", "qualified", "qualified", "invalid", "duplicate"] as const;

  for (let i = 0; i < 30; i++) {
    const prop = pick(propertyIds);
    const campaign = pick(CAMPAIGNS);
    const status = statuses[i % statuses.length];
    const name = pick(LEAD_NAMES);
    const daysAgo = rand(0, 25);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - rand(0, 43200000));

    const score = rand(40, 100);
    const sdrId = status !== "new" ? pick(sdrIds) : null;
    const qualifiedAt = status === "qualified" ? new Date(createdAt.getTime() + rand(5, 120) * 60000) : null;

    const [lead] = await db.insert(schema.leads).values({
      name,
      phone: `11${rand(90000, 99999)}${rand(1000, 9999)}`,
      email: `${name.toLowerCase().replace(/\s/g, ".")}${rand(10, 99)}@email.com`,
      tenantId: prop.tenantId,
      sourcePropertyId: prop.id,
      origin: pick(["meta_ads", "meta_ads", "meta_ads", "lp", "manual"] as const),
      campaignId: campaign.id,
      adName: campaign.name,
      adsetName: campaign.adset,
      formName: campaign.form,
      utmSource: pick(["facebook", "instagram", null, null] as any),
      utmMedium: "cpc",
      utmCampaign: campaign.name.toLowerCase().replace(/\s/g, "-"),
      status,
      qualityScore: score,
      sdrId,
      qualifiedAt,
      createdAt,
      updatedAt: createdAt,
    }).returning();

    leadIds.push(lead.id);
  }
  console.log(`  ✓ 30 leads criados`);

  // 6. Assignments (leads qualificados → corretores)
  console.log("\n🔀 Criando distribuições (assignments)...");
  const qualifiedLeads = await db.select().from(schema.leads)
    .where(schema.leads.status.eq ? undefined : undefined as any)
    .limit(100);

  // Buscar leads qualificados diretamente
  const ql = await sql`SELECT id, tenant_id FROM leads WHERE status = 'qualified' LIMIT 20`;

  const assignmentStatuses = ["new", "contacted", "contacted", "visiting", "proposal", "won", "lost"] as const;

  for (const lead of ql) {
    const numBrokers = rand(1, 2);
    const shuffled = [...brokerIds].sort(() => Math.random() - 0.5).slice(0, numBrokers);
    for (const broker of shuffled) {
      const aStatus = pick(assignmentStatuses);
      const [assignment] = await db.insert(schema.leadAssignments).values({
        leadId: lead.id,
        brokerId: broker.id,
        assignedBySdrId: pick(sdrIds),
        status: aStatus,
        lossReason: aStatus === "lost" ? pick(LOSS_REASONS) : null,
      }).returning();

      // Atividades por assignment
      const numActivities = rand(1, 4);
      for (let j = 0; j < numActivities; j++) {
        const type = pick(["call", "whatsapp", "visit", "note"] as const);
        const notes = pick(ACTIVITY_NOTES[type] ?? ACTIVITY_NOTES.note);
        await db.insert(schema.leadActivities).values({
          leadAssignmentId: assignment.id,
          userId: broker.id,
          type,
          notes,
        });
      }
    }
  }
  console.log(`  ✓ Assignments e atividades criados`);

  console.log("\n✅ Seed demo concluído!");
  console.log("\n📊 Resumo:");
  console.log(`  • ${TENANT_DATA.length} tenants (BMs)`);
  console.log(`  • ${BROKER_DATA.length} corretores`);
  console.log(`  • ${SDR_DATA.length} SDR`);
  console.log(`  • ${propertyIds.length} imóveis`);
  console.log(`  • 30 leads (novos, aguardando, qualificados, inválidos, duplicados)`);
  console.log(`  • Assignments e atividades nos leads qualificados`);
  console.log("\n🔑 Todos os usuários: senha PlaceGo@2026");

  await sql.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Erro no seed:", e.message ?? e);
  process.exit(1);
});
