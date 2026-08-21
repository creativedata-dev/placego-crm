import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { getWabaHealth, getPhoneStatus } from "@/lib/meta-waba";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin_placego", "admin_tenant"]);

    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    if (!tenant.metaPhoneNumberId || !tenant.metaAccessToken) {
      return NextResponse.json({ error: "Meta Cloud API não configurada para esta empresa" }, { status: 422 });
    }

    // Se tiver WABA ID, busca saúde completa da conta
    if (tenant.metaWabaId) {
      try {
        const health = await getWabaHealth(tenant.metaWabaId, tenant.metaAccessToken);
        return NextResponse.json({ mode: "full", ...health });
      } catch {
        // Fallback para status do número individual
      }
    }

    // Fallback: só o número configurado
    const status = await getPhoneStatus(tenant.metaPhoneNumberId, tenant.metaAccessToken);
    return NextResponse.json({ mode: "phone", phoneNumbers: [status] });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
