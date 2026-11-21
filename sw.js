// Service worker do Leitor EPUB: guarda o app no aparelho para funcionar offline.
// Estratégia: abre sempre a cópia guardada (rápido e offline) e, se houver internet,
// baixa a versão nova em segundo plano (sem usar o cache do navegador). A versão nova aparece na próxima abertura.
const CACHE = "leitor-v3";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // blob:, data: e outros sites passam direto

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "./" : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response("Sem conexão", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  })());
});
