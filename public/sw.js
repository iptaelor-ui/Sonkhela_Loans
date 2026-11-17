// Minimal service worker: makes the app installable and shows a friendly
// screen instead of an error when there's no internet. Nothing else is cached,
// so loan data is always fresh.
const CACHE = "offline-v1";
const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#145f39;color:#fff;text-align:center;padding:24px}
.c{max-width:320px}h1{font-size:1.3rem;margin:0 0 8px}p{opacity:.8;line-height:1.5;margin:0 0 20px}
button{background:#fff;color:#145f39;border:0;border-radius:10px;padding:12px 22px;font-weight:700;font-size:1rem}</style></head>
<body><div class="c"><h1>You're offline</h1><p>Check your internet connection, then try again.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.put("/__offline", new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html" } }))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // only page loads; data always goes to the network
  e.respondWith(fetch(e.request).catch(() => caches.match("/__offline")));
});
