/* RightAware auth (v2): demo sessions today, Supabase Auth-ready.
   DEMO BEHAVIOUR: signup/login store a local session only (NOT secure, NOT synced).
   Never reuse a real password here. To go live: set BACKEND=supabase + keys in
   window.__ENV__, implement js/supabase-client.js per DATABASE.md, and flip
   RA_FEATURES.authMode to "supabase". All call sites use this API, so no page
   rewrites are needed. Admin roles are checked server-side (never trust client). */
(function(){
  const KEY = "ra_demo_user";
  const Auth = {
    mode: "demo",
    current(){ try{ return JSON.parse(localStorage.getItem(KEY) || "null"); }catch(_){ return null; } },
    isAdmin(){ const u = this.current(); return !!(u && u.role === "admin" && this.mode !== "demo"); },
    // NOTE: in demo mode ANY @admin flag is ignored — admin.html enforces this.
    signup(name, email){ const u = { name, email, role:"user", at:new Date().toISOString(), demo:true }; try{localStorage.setItem(KEY, JSON.stringify(u));}catch(_){} return u; },
    login(email){ const u = { name:(email||"").split("@")[0]||"Member", email, role:"user", at:new Date().toISOString(), demo:true }; try{localStorage.setItem(KEY, JSON.stringify(u));}catch(_){} return u; },
    logout(){ try{localStorage.removeItem(KEY);}catch(_){} },
    requestRecovery(email){ // demo: just records the request; real reset email needs Supabase
      try{ const a = JSON.parse(localStorage.getItem("ra_recovery")||"[]"); a.push({email, at:new Date().toISOString()}); localStorage.setItem("ra_recovery", JSON.stringify(a)); }catch(_){}
      return "Demo: password recovery email is not sent. Supabase Auth is required for real resets (see SETUP.md).";
    },
    guard(){ // returns user or redirects to login
      const u = this.current(); if(!u) location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop()+location.search); return u;
    }
  };
  window.RA_AUTH = Auth;
})();
