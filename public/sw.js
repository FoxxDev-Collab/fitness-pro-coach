/* Praevio service worker — minimal app-shell cache.
 * Network-first for navigations (never caches authed HTML — only falls back to
 * the public shell when offline), cache-first for immutable static assets. */
const CACHE = "praevio-shell-v1";
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
