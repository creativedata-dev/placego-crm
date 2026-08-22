import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

async function sendToUser(userId: string, payload: PushPayload) {
  // Configurado aqui para garantir que as env vars estejam disponíveis em runtime
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, icon: payload.icon ?? "/icon-192.png" })
      )
    )
  );

  // Remove subscriptions inválidas (410 Gone = dispositivo desregistrado)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" && (r.reason as any)?.statusCode === 410;
    })
    .map((s) => s.endpoint);

  if (expiredEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, expiredEndpoints));
  }
}

export async function notifySdrNewContact(sdrId: string, contactName: string, origin: string) {
  await sendToUser(sdrId, {
    title: "Novo contato recebido",
    body: `${contactName} chegou via ${origin}`,
    url: "/sdr/queue",
  });
}

export async function notifyBrokerNewLead(
  brokerId: string,
  contactName: string,
  opts?: {
    phone?: string | null;
    email?: string | null;
    assignmentId?: string | null;
    notes?: string | null;
  }
) {
  const lines: string[] = [];
  if (opts?.phone) lines.push(`📞 ${opts.phone}`);
  if (opts?.email) lines.push(`✉️ ${opts.email}`);
  if (opts?.notes) lines.push(`💬 ${opts.notes}`);

  const body = lines.length > 0
    ? lines.join(" · ")
    : `${contactName} foi distribuído para o seu pipeline`;

  await sendToUser(brokerId, {
    title: `Novo lead: ${contactName}`,
    body,
    url: opts?.assignmentId ? `/pipeline/${opts.assignmentId}` : "/pipeline",
  });
}
