/* RightAware service worker (v3): offline-first public content + privacy rules.
   CACHING POLICY (privacy):
   - Only same-origin GET requests for PUBLIC pages/assets are cached.
   - Never cached: authenticated/API traffic (Authorization header, /api/*),
     cross-origin requests (Supabase REST, CDNs), private shells
     (account/admin/login/signup), and any non-GET request.
   - localStorage data (sessions, saved items) is NEVER touched from here.
   - Cached legal content may be out of date; offline.html says so.
   Registers only on http(s) — skipped on file:// (see app.js). */
const CACHE = "rightaware-v3";
const CORE = [
  "./", "./index.html", "./rights.html", "./laws.html", "./videos.html",
  "./organizations.html", "./resources.html", "./help.html", "./about.html",
  "./contact.html", "./search.html",
  "./rights/topic.html", "./rights/arrest-rights.html",
  "./styles.css", "./app.js", "./data.js",
  "./js/config.js", "./js/db.js", "./js/auth.js", "./js/ai.js",
  "./js/i18n.js", "./content/i18n.js",
  "./content/rights.js", "./content/laws.js", "./content/videos.js",
  "./content/organizations.js", "./content/professionals.js",
  "./offline.html"
];
const PRIVATE = ["/account.html", "/admin.html", "/login.html", "/signup.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // mutations always go to network
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // API + authenticated + cross-origin traffic: never in the public cache.
  if (url.pathname.startsWith("/api/") || req.headers.get("authorization")) {
    e.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ ok: false, error: "offline" }), { headers: { "Content-Type": "application/json" } })));
    return;
  }
  if (!sameOrigin) { e.respondWith(fetch(req)); return; } // Supabase/fonts: network only
  if (PRIVATE.includes(url.pathname)) {                   // auth shells: network-first, uncached
    e.respondWith(fetch(req).catch(() => caches.match("./offline.html")));
    return;
  }

  // Public content: cache-first, write-through; offline falls back to offline page.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./offline.html")))
  );
});
