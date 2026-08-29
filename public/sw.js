// Minimal PWA service worker. Deliberately does NOT cache authenticated
// pages or API/Supabase responses (this app is per-user health data — an
// offline cache of another user's session would be a privacy bug). It only
// caches the static app shell so the icon/theme show up while offline or
// slow-starting, then falls back to the network for everything else.
const CACHE_NAME = "wasfati-shell-v2";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isShellAsset = SHELL_ASSETS.includes(url.pathname);
  if (!isShellAsset) return; // let everything else (pages, Supabase calls) hit the network normally

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
