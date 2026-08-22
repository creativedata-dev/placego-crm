import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { listTemplates } from "@/lib/meta-waba";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin_placego", "admin_tenant"]);
    const tenantId = req.nextUrl.searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId obrigatório" }, { status: 400 });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant?.metaWabaId || !tenant?.metaAccessToken) {
      return NextResponse.json({ error: "Meta Cloud API não configurada" }, { status: 422 });
    }

    const templates = await listTemplates(tenant.metaWabaId, tenant.metaAccessToken);
    return NextResponse.json(templates);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
