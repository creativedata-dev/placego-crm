"use client";

import { useState, useEffect } from "react";

export default function PushTestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [vapidKey] = useState(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "NÃO DEFINIDA");

  function addLog(msg: string) {
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  }

  useEffect(() => {
    addLog(`VAPID key: ${vapidKey.slice(0, 20)}...`);
    addLog(`serviceWorker suportado: ${"serviceWorker" in navigator}`);
    addLog(`PushManager suportado: ${"PushManager" in window}`);
    addLog(`Notification.permission: ${Notification.permission}`);
    checkSW();
  }, []);

  async function checkSW() {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      addLog(`SWs registrados: ${regs.length}`);
      regs.forEach((r, i) => addLog(`  SW[${i}] scope: ${r.scope} state: ${r.active?.state ?? "none"}`));

      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout 5s")), 5000)),
      ]);
      addLog(`SW ready: ${(ready as ServiceWorkerRegistration).active?.state}`);

      const sub = await (ready as ServiceWorkerRegistration).pushManager.getSubscription();
      addLog(`Subscription existente: ${sub ? "SIM — " + sub.endpoint.slice(0, 50) + "..." : "NÃO"}`);
    } catch (e: any) {
      addLog(`ERRO checkSW: ${e.message}`);
    }
  }

  async function doSubscribe() {
    addLog("--- iniciando subscribe ---");
    try {
      const reg = await navigator.serviceWorker.ready;
      addLog(`SW pronto: ${reg.active?.state}`);

      const permission = await Notification.requestPermission();
      addLog(`Permissão: ${permission}`);
      if (permission !== "granted") return;

      function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const uint8 = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
        return uint8.buffer as ArrayBuffer;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      addLog(`Subscription criada: ${sub.endpoint.slice(0, 60)}...`);

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      addLog(`API /api/push/subscribe: ${res.status} ${res.ok ? "OK" : "ERRO"}`);
    } catch (e: any) {
      addLog(`ERRO subscribe: ${e.message}`);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-xl">
      <h1 className="text-lg font-bold">Push Notification — Debug</h1>

      <div className="flex gap-2 flex-wrap">
        <button onClick={checkSW} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded">
          Checar SW
        </button>
        <button onClick={doSubscribe} className="bg-green-600 text-white text-sm px-3 py-1.5 rounded">
          Subscrever
        </button>
        <button onClick={() => setLog([])} className="bg-zinc-600 text-white text-sm px-3 py-1.5 rounded">
          Limpar
        </button>
      </div>

      <div className="bg-zinc-900 text-green-400 text-xs font-mono rounded-lg p-3 space-y-0.5 min-h-40">
        {log.length === 0 && <p className="text-zinc-500">aguardando...</p>}
        {log.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </div>
  );
}
