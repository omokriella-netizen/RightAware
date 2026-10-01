/* RightAware service worker (v7): offline-first public content + privacy rules.
   CACHING POLICY (privacy):
   - Only same-origin GET requests for PUBLIC pages/assets are cached.
   - Never cached: authenticated/API traffic (Authorization header, /api/*),
     cross-origin requests (Supabase REST, CDNs), private shells
     (account/admin/login/signup), and any non-GET request.
   - localStorage data (sessions, saved items) is NEVER touched from here.
   - Cached legal content may be out of date; offline.html says so.
   Registers only on http(s) — skipped on file:// (see app.js). */
/* v7: purge the pre-P9-sync js/db.js from device caches. v6 kept serving the
    old presence-based profile push from cache (stale-while-revalidate) on the
    first load after a deploy, so a device could push a stale local profile
    over a newer account copy (cross-device B→A revert). v7 forces a fresh
    precache of the CAS-based sync code (RA_DB.v === "db4").
   v6: Stage 6 (real contact system). v5 served public HTML cache-first, so a
    deploy stayed invisible behind the cached copy — production already had the
    new Get Help report flow while browsers kept showing the old
    "Report form (demo — local only)" heading. Navigations are now network-first
    (cache fallback for offline) and static assets are stale-while-revalidate,
    so a deploy lands without needing a cache-version bump.
   v5: auth/trust update — new js/turnstile.js, updated index/login/signup,
   supplied logo in headers/footers, Right of the Day (client-injected).
   v4: cleanUrls (Vercel 308s) must stay OFF - a 308 makes addAll/fetch store a
   redirected response, and answering a navigation with it fails with net::ERR_FAILED. */
const CACHE = "rightaware-v7";
const CORE = [
  "./", "./index.html", "./rights.html", "./laws.html", "./videos.html",
  "./organizations.html", "./resources.html", "./help.html", "./about.html",
  "./contact.html", "./search.html",
  "./rights/topic.html", "./rights/arrest-rights.html",
  "./styles.css", "./app.js", "./data.js",
  "./js/config.js", "./js/db.js", "./js/auth.js", "./js/ai.js",
  "./js/turnstile.js",
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
  // Connection files: always fresh so regenerated keys / connector updates apply at once.
  if (url.pathname.endsWith("/env.local.js") || url.pathname.endsWith("/js/supabase-client.js")) { e.respondWith(fetch(req)); return; }
  if (!sameOrigin) { e.respondWith(fetch(req)); return; } // Supabase/fonts: network only
  if (PRIVATE.includes(url.pathname)) {                   // auth shells: network-first, uncached
    e.respondWith(fetch(req).catch(() => caches.match("./offline.html")));
    return;
  }

  // Public content:
  //  - Navigations (HTML) are network-first, so a deploy is visible on the very
  //    next reload; offline falls back to the cached copy, then offline.html.
  //  - Assets (CSS/JS/images) are stale-while-revalidate: the cached copy is
  //    served instantly and the cache refreshes in the background.
  const store = (res) => {
    if (res && res.ok && res.type === "basic" && !res.redirected) { // never cache a redirect-followed body
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };
  const fromNetwork = (offlineFallback) => fetch(req).then(store).catch(() => offlineFallback);

  if (req.mode === "navigate") {
    // Network-first so a deploy shows on the next reload — but a slow network
    // must not block a page we already hold: race the network against 2.5s,
    // then use the cached copy, then offline.html. If the network answers late,
    // `store` has already refreshed the cache for the next reload.
    const slowNetwork = new Promise((r) => setTimeout(() => r(undefined), 2500));
    const winner = Promise.race([fetch(req).then(store).catch(() => undefined), slowNetwork]);
    e.respondWith(
      winner.then((res) => res || caches.match(req).then((hit) => hit || caches.match("./offline.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) { fromNetwork(null); return hit; }   // background refresh, no reload needed
      return fromNetwork(caches.match("./offline.html"));
    })
  );
});
