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

    // Tenta pegar o QR code
    try {
      const qrData = await getQRCode(instance);
      const qrcode = qrData?.base64 ?? qrData?.qrcode?.base64 ?? null;
      return NextResponse.json({ state, qrcode });
    } catch {
      return NextResponse.json({ state });
    }
  } catch {
    return NextResponse.json({ state: "not_found" }, { status: 404 });
  }
}
