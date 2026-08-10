"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export function PushSubscribe() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (Notification.permission === "denied") {
        setState("denied");
      } else if (sub) {
        setState("subscribed");
      } else {
        setState("unsubscribed");
      }
    } catch {
      setState("unsubscribed");
    }
  }

  async function subscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setState("subscribed");
    } catch {
      setState("unsubscribed");
    }
  }

  async function unsubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch {
      setState("unsubscribed");
    }
  }

  if (state === "unsupported") return null;

  if (state === "loading") {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Notificações
      </Button>
    );
  }

  if (state === "denied") {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" />
        Notificações bloqueadas
      </Button>
    );
  }

  if (state === "subscribed") {
    return (
      <Button variant="ghost" size="sm" onClick={unsubscribe} className="gap-2 text-xs text-green-600 hover:text-destructive">
        <Bell className="h-3.5 w-3.5" />
        Notificações ativas
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={subscribe} className="gap-2 text-xs">
      <BellOff className="h-3.5 w-3.5" />
      Ativar notificações
    </Button>
  );
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const uint8 = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  return uint8.buffer as ArrayBuffer;
}
