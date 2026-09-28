/* RightAware Supabase connector (v2). Fails safe: without credentials the app
   stays in local demo mode. Credentials resolve in order:
   1) window.__ENV__ (injected server-side; Vercel path), 2) localStorage "ra_env"
   (local static testing; never committed), else demo mode.
   On success it exposes window.RA_SUPA.client, sets RA_FEATURES.backendConnected,
   and fires "ra:backend-ready". js/db.js + js/auth.js swap over on that flag
   (see DATABASE.md). Requires internet for the CDN SDK. */
(function(){
  window.RA_SUPA = window.RA_SUPA || { ready:false, client:null };
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
  var c = creds();
  if(!c.SUPABASE_URL || !c.SUPABASE_PUBLISHABLE_KEY) return;
  if(!/^https?:\/\//.test(c.SUPABASE_URL)) return;
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
        }
      }).catch(function(){});
    }catch(_){}
  };
  document.head.appendChild(s);
})();
