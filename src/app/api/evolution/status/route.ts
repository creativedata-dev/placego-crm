import { NextResponse } from "next/server";
import { getInstanceStatus, getQRCode } from "@/lib/evolution";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get("instance");
  if (!instance) return NextResponse.json({ error: "Missing instance" }, { status: 400 });

  try {
    const statusData = await getInstanceStatus(instance);
    const state = statusData?.instance?.state ?? statusData?.state ?? "close";

    if (state === "open") {
      return NextResponse.json({ state: "open" });
    }

    // Tenta pegar o QR code — Evolution retorna { base64, code, pairingCode }
    try {
      const qrData = await getQRCode(instance);
      // base64 vem na raiz do objeto
      const qrcode = qrData?.base64 ?? qrData?.qrcode?.base64 ?? qrData?.qrCode?.base64 ?? null;
      return NextResponse.json({ state, qrcode });
    } catch {
      return NextResponse.json({ state });
    }
  } catch (err: any) {
    // Instância não encontrada ou Evolution offline
    console.error("[evolution/status]", err?.message ?? err);
    return NextResponse.json({ state: "disconnected" }, { status: 200 }); // 200 para não quebrar o componente
  }
}
