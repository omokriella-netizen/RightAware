/* RightAware service worker (v11): offline-first public content + privacy rules.
   CACHING POLICY (privacy):
   - Only same-origin GET requests for PUBLIC pages/assets are cached.
   - Never cached: authenticated/API traffic (Authorization header, /api/*),
     cross-origin requests (Supabase REST, CDNs), private shells
     (account/admin/login/signup + the professional/organisation workspaces),
     and any non-GET request.
   - localStorage data (sessions, saved items) is NEVER touched from here.
   - Cached legal content may be out of date; offline.html says so.
   Registers only on http(s) — skipped on file:// (see app.js). */
/* v11: purge stale precaches of the files changed together in this build:
       js/auth.js (specialisation rows now attach with an idempotent upsert and
       retry honestly instead of failing silently; dead isAdmin removed),
       js/ai.js (401 now surfaces an explicit "sign in required" answer instead
       of masquerading as an offline fallback), js/config.js (dead
       OFFLINE_CACHE flag removed) and styles.css (keyboard focus rings
       restored on the hero search). The professional/organisation workspace
       shells join PRIVATE (network-first, never cached) so the privacy policy
       matches what the pages actually are.
     v10: purge pre-multi-app js/auth.js from device caches. This build stores
       pending professional/organisation applications as a LIST keyed by
       table + applicant e-mail (ra_pending_apps), so a second application on
       one browser can never overwrite — and silently destroy — an earlier
       applicant's payload; a legacy ra_pending_app slot migrates on read. A
       stale-while-revalidate v9 copy of js/auth.js would still read only the
       single-slot key while new signup.html writes only the list, orphaning
       the payload — the version move makes the new flush code live on the
       first load after this deploy. admin.html (copy-vs-record status now
       rendered outside the collapsed details, honest empty-state note,
       build: admin-20261001-3) and signup.html (honest queue-fallback text)
       are PRIVATE network-first shells and need no cache move.
    v9: purge db5-era js/auth.js + js/db.js from device caches. db6 hardens the
      auth flows: login.html renders link-error text as TEXT (no HTML injection
      from ?error_description=) and only accepts same-site ?next= targets, the
      pending-application flush refuses a payload whose applicant email does
      not match the signed-in account (and stops retrying a row that already
      exists), and the organisation status lookup matches email
      case-insensitively. HTML shells are network-first, but js/auth.js is
      stale-while-revalidate — the version move makes the new auth code live on
      the first load after this deploy.
    v8: purge pre-db5 copies of js/db.js. db5 fixes saved-items sync — the
     sync passes only what a device ADDED since its last pull (ra_saved_base
     snapshot + 3-way merge), the pull always runs even when the push fails,
     and the pages hosting save buttons (rights/topic, videos) now load
     js/auth.js so uid() is known and a save pushes immediately. A cached db4
     copy could re-upload rows the account removed elsewhere and never pushed
     saves made on those pages — v8 + "?v=db5" tags remove it.
   v7: purge the pre-P9-sync js/db.js from device caches. v6 kept serving the
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
const CACHE = "rightaware-v11";
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
const PRIVATE = ["/account.html", "/admin.html", "/login.html", "/signup.html",
                 "/professional.html", "/organization.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch((err) => {
    // Never hide a broken precache list: one missing CORE URL must be visible.
    console.error("RightAware SW: precache failed (core files may be missing):", err);
    return self.skipWaiting();
  }));
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
