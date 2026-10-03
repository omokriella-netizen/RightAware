/* RightAware Supabase connector (v3). Fails safe: without credentials the app
   stays in local demo mode. Credentials resolve in order:
   1) window.__ENV__ (injected server-side; Vercel path),
   2) localStorage "ra_env" (manual override: RA_SUPA.configure; never committed),
   3) env.local.js - the generated PUBLIC-only file (tools/make-env.ps1 reads
      .env.local and copies the whitelist; secrets never reach the browser).
   On success it exposes window.RA_SUPA.client, sets RA_FEATURES.backendConnected,
   and fires "ra:backend-ready". js/db.js + js/auth.js swap over on that flag
   (see DATABASE.md). Requires internet for the CDN SDK. */
(function(){
  window.RA_SUPA = window.RA_SUPA || { ready:false, client:null };
  var mySrc = "";
  try{ mySrc = (document.currentScript && document.currentScript.src) || ""; }catch(_){}
  // This file lives in <root>/js/ but env.local.js is generated at the SITE ROOT
  // (tools/make-env.ps1), so strip the "js/<this file>" suffix to get the root URL.
  var base = "";
  if(mySrc){
    var m = mySrc.match(/^(.*\/)js\/supabase-client\.js(?:\?.*)?$/);
    base = m ? m[1] : "";
  }
  if(!base){ // fallback: every page loads the shared app.js from the site root
    try{
      var as = document.querySelector('script[src*="app.js"]');
      var am = as && as.src ? as.src.match(/^(.*\/)app\.js(?:\?.*)?$/) : null;
      if(am) base = am[1];
    }catch(_){}
  }
  function creds(){
    var c = { SUPABASE_URL:"", SUPABASE_PUBLISHABLE_KEY:"" };
    try{ Object.assign(c, window.__ENV__ || {}); }catch(_){}
    try{ var o = JSON.parse(localStorage.getItem("ra_env") || "null"); if(o) Object.assign(c, o); }catch(_){}
    return c;
  }
  // Dev helper: RA_SUPA.configure(url, key) stores a browser-local override then reloads.
  window.RA_SUPA.configure = function(url, key){
    try{ localStorage.setItem("ra_env", JSON.stringify({ SUPABASE_URL:url, SUPABASE_PUBLISHABLE_KEY:key })); }catch(_){}
    location.reload();
  };
  window.RA_SUPA.clearLocal = function(){ try{ localStorage.removeItem("ra_env"); }catch(_){} location.reload(); };

  var started = false;
  function start(c){
    if(started) return;
    if(!c.SUPABASE_URL || !c.SUPABASE_PUBLISHABLE_KEY) return;
    if(!/^https?:\/\//.test(c.SUPABASE_URL)) return;
    started = true;
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = function(){
      try{
        var client = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_PUBLISHABLE_KEY);
        window.RA_SUPA.client = client;
        client.from("faqs").select("id", { count:"exact", head:true }).then(function(r){
          if(r && !r.error){
            window.RA_SUPA.ready = true;
            try{
              if(window.RA_FEATURES) RA_FEATURES.backendConnected = true;
              if(window.RA_CONFIG){ RA_CONFIG.BACKEND = "supabase"; RA_CONFIG.SUPABASE_URL = c.SUPABASE_URL; RA_CONFIG.SUPABASE_PUBLISHABLE_KEY = c.SUPABASE_PUBLISHABLE_KEY; }
            }catch(_){}
            document.dispatchEvent(new CustomEvent("ra:backend-ready"));
          } else {
            window.RA_SUPA.error = (r && r.error && (r.error.message || String(r.error))) || "backend probe failed";
            if(window.console && console.warn) console.warn("RightAware: Supabase readiness probe failed — staying in demo mode:", window.RA_SUPA.error);
          }
        }).catch(function(e){
          window.RA_SUPA.error = (e && (e.message || String(e))) || "backend probe failed";
          if(window.console && console.warn) console.warn("RightAware: Supabase readiness probe failed — staying in demo mode:", window.RA_SUPA.error);
        });
      }catch(_){}
    };
    document.head.appendChild(s);
  }

  var c = creds();
  if(c.SUPABASE_URL && c.SUPABASE_PUBLISHABLE_KEY) start(c);
  // ALWAYS try the generated public file (git-ignored). It merges only keys
  // that are still missing (never clobbers window.__ENV__/ra_env values) and
  // it may carry TURNSTILE_SITE_KEY even when the Supabase credentials already
  // came from elsewhere — skipping it silently disabled CAPTCHA. Missing file
  // = quiet demo mode (onerror is expected on fresh checkouts).
  try{
    var es = document.createElement("script");
    es.src = base + "env.local.js";
    es.onload = function(){
      if(started) return; // already started from existing creds
      var c2 = creds();
      if(c2.SUPABASE_URL && c2.SUPABASE_PUBLISHABLE_KEY) start(c2);
    };
    es.onerror = function(){ /* no generated env file - stay in demo mode */ };
    document.head.appendChild(es);
  }catch(_){}
})();
