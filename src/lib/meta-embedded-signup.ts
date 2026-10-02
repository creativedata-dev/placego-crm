// Embedded Signup — troca do "code" do FB.login por token e ativação do WABA/número.
// Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup

const GRAPH = "https://graph.facebook.com/v21.0";

interface ExchangeResult {
  accessToken: string;
  expiresIn?: number;
}

export async function exchangeCodeForToken(code: string): Promise<ExchangeResult> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("NEXT_PUBLIC_META_APP_ID / META_APP_SECRET não configurados");
  }

  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message ?? "Falha ao trocar code por token");
  }

  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

// Assina o app da PlaceGo no WABA recém-conectado — necessário para receber webhooks desse WABA.
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || data?.success !== true) {
    throw new Error(data?.error?.message ?? "Falha ao assinar app no WABA");
  }
}

// Confere se o access token de fato tem acesso ao phone_number_id retornado pelo signup —
// evita persistir credencial de um WABA que o token não controla.
export async function verifyPhoneBelongsToToken(
  phoneNumberId: string,
  accessToken: string
): Promise<{ ok: boolean; displayPhone?: string; error?: string }> {
  const res = await fetch(
    `${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error?.message ?? "Token sem acesso a este número" };
  return { ok: true, displayPhone: data.display_phone_number };
}
