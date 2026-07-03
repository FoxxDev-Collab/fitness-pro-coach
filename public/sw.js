/* Praevio service worker — minimal app-shell cache.
 * Network-first for navigations (never caches authed HTML — only falls back to
 * the public shell when offline), cache-first for immutable static assets. */
const CACHE = "praevio-shell-v2";
const SHELL = ["/"]; // public shell used as the offline fallback only

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept auth, API, or magic-link verification — always live network.
  if (url.pathname.startsWith("/api")) return;
  if (url.pathname.startsWith("/portal/verify")) return;

  // Navigations: network-first, fall back to the cached public shell offline.
  // Authed HTML is never written to the cache, so nothing leaks between users.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/")));
    return;
  }

  // Immutable static assets: cache-first, then populate.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

// ─── Web push ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Praevio", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Praevio";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/portal" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/portal";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an already-open portal tab if we have one.
      for (const client of all) {
        if (client.url.includes("/portal") && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      // Otherwise reuse any window, else open a new one.
      if (all.length > 0 && "focus" in all[0]) {
        await all[0].focus();
        if ("navigate" in all[0]) await all[0].navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
