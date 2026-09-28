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

  /* ---- Supabase-backed methods (used when RA_SUPA is ready; demo otherwise) ---- */
  Auth.supabaseReady = function(){ try{ return !!(window.RA_SUPA && RA_SUPA.ready && RA_SUPA.client); }catch(_){ return false; } };
  Auth.mirrorSession = function(sbUser){
    if(!sbUser) return null;
    var meta = sbUser.user_metadata || {};
    var u = { name: meta.name || (sbUser.email || "").split("@")[0] || "Member",
      email: sbUser.email || "", supabaseId: sbUser.id, role: "user",
      demo: false, at: new Date().toISOString() };
    try{ localStorage.setItem(KEY, JSON.stringify(u)); }catch(_){}
    try{ Auth.mode = "supabase"; Auth.fetchRole(); }catch(_){}
    return u;
  };
  Auth.fetchRole = async function(){
    try{
      if(!this.supabaseReady()) return "user";
      var r = await RA_SUPA.client.from("user_roles").select("role");
      var roles = ((r.data) || []).map(function(x){ return x.role; });
      var u = this.current() || {};
      u.role = roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : roles.includes("moderator") ? "moderator" : "user";
      try{ localStorage.setItem(KEY, JSON.stringify(u)); }catch(_){}
      return u.role;
    }catch(_){ return "user"; }
  };
  Auth.signupLive = async function(name, email, pass){
    if(!this.supabaseReady()) return { ok:false, error:"backend not connected" };
    try{
      var r = await RA_SUPA.client.auth.signUp({ email:email, password:pass, options:{ data:{ name:name } } });
      if(r.error) return { ok:false, error:r.error.message };
      if(r.data && r.data.user) this.mirrorSession(r.data.user);
      var needsConfirm = !(r.data && r.data.session);
      return { ok:true, note: needsConfirm ? "Check your inbox to confirm email before login." : "Signed in." };
    }catch(_){ return { ok:false, error:"Signup failed. Try again." }; }
  };
  Auth.loginLive = async function(email, pass){
    if(!this.supabaseReady()) return { ok:false, error:"backend not connected" };
    try{
      var r = await RA_SUPA.client.auth.signInWithPassword({ email:email, password:pass });
      if(r.error) return { ok:false, error:r.error.message };
      if(r.data && r.data.user) this.mirrorSession(r.data.user);
      return { ok:true };
    }catch(_){ return { ok:false, error:"Login failed. Try again." }; }
  };
  Auth.logoutLive = async function(){
    try{ if(this.supabaseReady()){ await RA_SUPA.client.auth.signOut(); } }catch(_){}
    this.logout();
    try{ Auth.mode = "demo"; }catch(_){}
  };
  Auth.recoverLive = async function(email){
    if(!this.supabaseReady()) return this.requestRecovery(email);
    try{
      var r = await RA_SUPA.client.auth.resetPasswordForEmail(email);
      return r.error ? r.error.message : "Recovery email sent — check inbox (and spam).";
    }catch(_){ return this.requestRecovery(email); }
  };
  try{
    document.addEventListener("ra:backend-ready", function(){
      try{
        Auth.mode = "supabase";
        RA_SUPA.client.auth.getSession().then(function(r){ if(r && r.data && r.data.session && r.data.session.user) Auth.mirrorSession(r.data.session.user); });
        RA_SUPA.client.auth.onAuthStateChange(function(ev, session){
          if(session && session.user) Auth.mirrorSession(session.user);
          if(ev === "SIGNED_OUT") Auth.logout();
        });
      }catch(_){}
    });
  }catch(_){}
})();
