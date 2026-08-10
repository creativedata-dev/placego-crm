const CACHE_NAME = "placego-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first para rotas autenticadas, cache-first para assets estáticos
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições que não são GET ou são de outras origens
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Assets estáticos: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(png|svg|ico|webp|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  // Tudo mais: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "PlaceGo CRM", body: event.data.text() };
  }

  const { title = "PlaceGo CRM", body = "", url = "/", icon = "/icon-192.png", badge = "/icon-192.png" } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin) && "focus" in c);
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
