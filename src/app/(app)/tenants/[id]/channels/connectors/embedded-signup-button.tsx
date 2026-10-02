"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Link2 } from "lucide-react";
import { connectEmbeddedSignup } from "../../whatsapp/actions";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface SignupData {
  wabaId: string | null;
  phoneNumberId: string | null;
  coexistence: boolean;
}

interface Props {
  tenantId: string;
  onConnected?: () => void;
}

export function EmbeddedSignupButton({ tenantId, onConnected }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const signupData = useRef<SignupData>({ wabaId: null, phoneNumberId: null, coexistence: false });

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA" || data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
          signupData.current.wabaId = data.data?.waba_id ?? null;
          signupData.current.phoneNumberId = data.data?.phone_number_id ?? null;
          // A Meta sinaliza coexistência quando o evento é o de onboarding do WhatsApp Business App
          signupData.current.coexistence = data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
        }
      } catch {
        // mensagens não-JSON do domínio facebook.com são ignoradas
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (window.FB) { setSdkReady(true); return; }
    window.fbAsyncInit = function () {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
      setSdkReady(true);
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, [appId]);

  function handleConnect() {
    if (!window.FB || !configId) return;
    setResult(null);
    signupData.current = { wabaId: null, phoneNumberId: null, coexistence: false };

    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setResult({ ok: false, message: "Login cancelado ou sem permissão concedida." });
          return;
        }
        setConnecting(true);
        connectEmbeddedSignup(tenantId, {
          code,
          wabaId: signupData.current.wabaId ?? "",
          phoneNumberId: signupData.current.phoneNumberId ?? "",
          coexistence: signupData.current.coexistence,
        }).then((res) => {
          setResult(res);
          setConnecting(false);
          if (res.ok) onConnected?.();
        });
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  if (!appId || !configId) {
    return (
      <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted">
        Embedded Signup não configurado — defina <code className="font-mono">NEXT_PUBLIC_META_APP_ID</code> e{" "}
        <code className="font-mono">NEXT_PUBLIC_META_CONFIG_ID</code> no ambiente.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleConnect}
        disabled={!sdkReady || connecting}
        size="sm"
        className="bg-[#1877F2] hover:bg-[#1461cc] text-white"
      >
        {connecting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
        {connecting ? "Conectando..." : "Conectar com WhatsApp Business"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Se o número já estiver ativo no app WhatsApp Business do celular, a Meta oferecerá manter os dois funcionando juntos (coexistência).
      </p>
      {result && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          result.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
        }`}>
          {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {result.message}
        </div>
      )}
    </div>
  );
}
