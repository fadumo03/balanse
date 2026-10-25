// Enkel service worker slik at appen åpner uten nett etter første besøk.
const CACHE = "balanse-v5";
const FILES = ["./", "index.html", "style.css", "icons.js", "plan.js", "garden.js", "app.js", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Nettverk først (så du alltid får nyeste versjon), cache som reserve uten nett.
// "no-cache" gjør at nettleserens HTTP-cache alltid sjekker med serveren, ellers kan gamle filer bli servert etter en oppdatering.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  event.respondWith(
    fetch(event.request, sameOrigin ? { cache: "no-cache" } : undefined)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
