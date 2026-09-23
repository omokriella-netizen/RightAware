/* RightAware service worker (v2): offline-first core content.
   Caches the shell + rights library + guides on install; serves cache-first for
   content pages, network-first for API; falls back to offline.html.
   Only registers on http(s) — skipped on file:// (see app.js note). */
const CACHE = "rightaware-v2";
const CORE = [
  "./", "./index.html", "./rights.html", "./laws.html", "./videos.html",
  "./organizations.html", "./resources.html", "./help.html", "./about.html",
  "./rights/topic.html", "./rights/arrest-rights.html",
  "./styles.css", "./app.js", "./data.js",
  "./js/config.js", "./js/db.js", "./js/auth.js", "./js/ai.js",
  "./content/rights.js", "./content/laws.js", "./content/videos.js",
  "./content/organizations.js", "./offline.html"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ ok: false, error: "offline" }), { headers: { "Content-Type": "application/json" } })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match("./offline.html")))
  );
});
