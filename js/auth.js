/* RightAware auth (v3): demo sessions today, Supabase Auth when connected.
   DEMO BEHAVIOUR: without a backend, signup/login store a local session only
   (NOT secure, NOT synced) — never reuse a real password there.
   LIVE BEHAVIOUR (js/auth.js below): email + password with Supabase email
   confirmation — an address is treated as verified ONLY after Supabase returns a
   real session; unconfirmed / already-registered / expired-link / resend /
   password-recovery states each have their own result. CAPTCHA tokens from
   js/turnstile.js are passed through as captcha_token (secret stays in Supabase).
   Admin roles are checked server-side (never trust client). All call sites use
   this API, so no page rewrites are needed. */
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
    // A session is now known on this page — js/db.js uses it to run/finish its sync.
    try{ document.dispatchEvent(new CustomEvent("ra:session-ready")); }catch(_){}
    return u;
  };
  Auth.fetchRole = async function(){
    try{
      if(!this.supabaseReady()) return "user";
      var roles = [];
      // Preferred: own-roles helper (works for every signed-in user; see applications-access.sql)
      try{
        var rpc = await RA_SUPA.client.rpc("ra_my_roles");
        if(rpc && !rpc.error && Array.isArray(rpc.data)) roles = rpc.data;
      }catch(_){}
      // Fallback: direct read (admins pass admin_roles policy; others may get [])
      if(!roles.length){
        try{
          var r = await RA_SUPA.client.from("user_roles").select("role");
          roles = ((r.data) || []).map(function(x){ return x.role; });
        }catch(_){}
      }
      var u = this.current() || {};
      u.role = roles.includes("admin") ? "admin" : roles.includes("editor") ? "editor" : roles.includes("moderator") ? "moderator" : roles.includes("professional") ? "professional" : "user";
      try{ localStorage.setItem(KEY, JSON.stringify(u)); }catch(_){}
      return u.role;
    }catch(_){ return "user"; }
  };
  /* Application status for the signed-in user (professional/org pathways).
     Returns null when nothing is found or the add-on policies are not applied. */
  Auth.myApplication = async function(){
    if(!this.supabaseReady()) return null;
    try{
      var pro = await RA_SUPA.client.from("professionals")
        .select("id,name,verification_status,qualification,location,created_at")
        .eq("user_id", (this.current()||{}).supabaseId || "").limit(1);
      if(pro && !pro.error && pro.data && pro.data.length) return { path:"professional", row:pro.data[0] };
    }catch(_){}
    try{
      var email = (this.current()||{}).email;
      if(email){
        var org = await RA_SUPA.client.from("organizations")
          .select("id,name,verification_status,created_at")
          .eq("email", email).limit(1);
        if(org && !org.error && org.data && org.data.length) return { path:"organisation", row:org.data[0] };
      }
    }catch(_){}
    return null;
  };
  /* Root URL of the site (for Supabase email links). js/auth.js is a sync script
     loaded from <root>/js/auth.js, so document.currentScript gives the root even
     when the current page is /rights/*. */
  var ROOT = "";
  try{
    var cs = document.currentScript && document.currentScript.src;
    if(cs) ROOT = cs.replace(/js\/auth\.js(?:\?.*)?$/, "");
  }catch(_){}
  if(!ROOT){ try{ ROOT = location.href.replace(/[^/]*$/, ""); }catch(_){} }
  Auth.signupRedirect = function(){ return ROOT + "login.html?confirmed=1"; };
  Auth.recoveryRedirect = function(){ return ROOT + "login.html?recovery=1"; };

  /* Create an account with Supabase Auth (email + password).
     The project REQUIRES email confirmation (mailer_autoconfirm = false), so a
     signup normally returns a user WITHOUT a session — the address is NOT
     verified at that point and no local session is created for it. Only a real
     Supabase session (confirmation completed, or confirmation disabled on the
     server) is ever mirrored as a login here.
     Returns: {ok:true, needsConfirm:true, email} | {ok:true, note} |
              {ok:false, alreadyRegistered:true, error} | {ok:false, error} */
  Auth.signupLive = async function(name, email, pass, o){
    o = o || {};
    if(!this.supabaseReady()) return { ok:false, error:"backend not connected" };
    try{
      var opts = { data:{ name:name }, emailRedirectTo: this.signupRedirect() };
      if(o.captchaToken) opts.captchaToken = o.captchaToken;
      var r = await RA_SUPA.client.auth.signUp({ email:email, password:pass, options:opts });
      if(r.error){
        var m = r.error.message || "";
        if(/already (been )?registered/i.test(m))
          return { ok:false, alreadyRegistered:true, error:"An account with this email already exists." };
        return { ok:false, error:m };
      }
      var user = r.data && r.data.user;
      // Supabase reports "email exists but is still unconfirmed" as an empty
      // identities list — offer the confirmation-email path, never a silent login.
      if(user && Array.isArray(user.identities) && user.identities.length === 0)
        return { ok:false, alreadyRegistered:true, error:"An account with this email already exists." };
      if(r.data && r.data.session){         // server has confirmation disabled: signed in at once
        if(user) this.mirrorSession(user);
        return { ok:true, note:"Signed in." };
      }
      // Account exists, EMAIL NOT CONFIRMED yet: no session and no local login.
      return { ok:true, needsConfirm:true, email:(user && user.email) || email,
        note:"Check your inbox — a confirmation link was sent to " + ((user && user.email) || email)
           + ". Your account activates only after you open it." };
    }catch(_){ return { ok:false, error:"Signup failed. Try again." }; }
  };
  /* Sign in. With confirmation required, GoTrue refuses unconfirmed addresses —
     surface that as its own state (with a resend action) instead of a raw error. */
  Auth.loginLive = async function(email, pass, o){
    o = o || {};
    if(!this.supabaseReady()) return { ok:false, error:"backend not connected" };
    try{
      var creds = { email:email, password:pass };
      // supabase-js v2: captchaToken lives in credentials.options (NOT top level)
      if(o.captchaToken) creds.options = { captchaToken:o.captchaToken };
      var r = await RA_SUPA.client.auth.signInWithPassword(creds);
      if(r.error){
        var m = r.error.message || "";
        if(/not confirmed/i.test(m)) return { ok:false, needsConfirm:true, error:"Email not confirmed" };
        if(/invalid login credentials/i.test(m)) return { ok:false, error:"Wrong email or password." };
        if(/rate limit|too many requests/i.test(m)) return { ok:false, error:"Too many attempts — wait a moment and try again." };
        return { ok:false, error:m };
      }
      if(r.data && r.data.user) this.mirrorSession(r.data.user);
      return { ok:true };
    }catch(_){ return { ok:false, error:"Login failed. Try again." }; }
  };
  /* Re-send the confirmation email (signup verification). */
  Auth.resendConfirmation = async function(email, o){
    o = o || {};
    if(!this.supabaseReady()) return "Backend not connected — confirmation emails are not sent in demo mode.";
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "⚠ Enter the email address you signed up with.";
    try{
      var opts = { emailRedirectTo: this.signupRedirect() };
      if(o.captchaToken) opts.captchaToken = o.captchaToken;
      var r = await RA_SUPA.client.auth.resend({ type:"signup", email:email, options:opts });
      if(r.error) return "⚠ " + (r.error.message || "Could not resend — try again shortly.");
      return "✅ Confirmation email resent — open the link in your inbox (check spam too).";
    }catch(_){ return "⚠ Could not resend — try again shortly."; }
  };
  /* Password reset: request a recovery link … */
  Auth.recoverLive = async function(email, o){
    o = o || {};
    if(!this.supabaseReady()) return this.requestRecovery(email);
    try{
      var opts = { redirectTo: this.recoveryRedirect() };
      if(o.captchaToken) opts.captchaToken = o.captchaToken;
      var r = await RA_SUPA.client.auth.resetPasswordForEmail(email, opts);
      return r.error ? ("⚠ " + r.error.message)
        : "✅ Reset link sent — check your inbox (and spam). Open it to choose a new password.";
    }catch(_){ return this.requestRecovery(email); }
  };
  /* … and apply the new password once the recovery link has opened a session. */
  Auth.completeRecovery = async function(newPass){
    if(!this.supabaseReady()) return { ok:false, error:"backend not connected" };
    if(!newPass || newPass.length < 8) return { ok:false, error:"Password must be at least 8 characters." };
    try{
      var r = await RA_SUPA.client.auth.updateUser({ password:newPass });
      if(r.error) return { ok:false, error:r.error.message || "Could not update the password." };
      return { ok:true };
    }catch(_){ return { ok:false, error:"Could not update the password — try again." }; }
  };
  Auth.logoutLive = async function(){
    try{ if(this.supabaseReady()){ await RA_SUPA.client.auth.signOut(); } }catch(_){}
    this.logout();
    try{ Auth.mode = "demo"; }catch(_){}
  };

  /* ---- Pending professional / organisation applications ----
     While the confirmation email is still unopened there is NO Supabase session,
     so the direct application insert is rejected by row-level security. The
     payload (never a password) is kept on this device and attached to the
     account automatically after the user confirms the email and signs in. */
  Auth.savePendingApplication = function(p){
    try{ localStorage.setItem("ra_pending_app", JSON.stringify(p)); }catch(_){}
  };
  Auth.pendingApplication = function(){
    try{ return JSON.parse(localStorage.getItem("ra_pending_app") || "null"); }catch(_){ return null; }
  };
  Auth.flushPendingApplication = async function(){
    if(!this.supabaseReady()) return null;
    var p = this.pendingApplication();
    if(!p || !p.table || !p.row) return null;
    var me = this.current() || {};
    if(!me.supabaseId || !me.email) return null;
    try{
      var row = p.row;
      if(p.table === "professionals") row.user_id = me.supabaseId;
      var r = await RA_SUPA.client.from(p.table).insert(row);
      if(r.error) return null;               // still not allowed — try again next sign-in
      if(p.extraTable && p.extraRows && p.extraRows.length){
        try{ await RA_SUPA.client.from(p.extraTable).insert(p.extraRows); }catch(_){}
      }
      try{ localStorage.removeItem("ra_pending_app"); }catch(_){}
      return { table:p.table, ref:p.ref || null };
    }catch(_){ return null; }
  };
  try{
    document.addEventListener("ra:backend-ready", function(){
      try{
        Auth.mode = "supabase";
        RA_SUPA.client.auth.getSession().then(function(r){ if(r && r.data && r.data.session && r.data.session.user) Auth.mirrorSession(r.data.session.user); });
        RA_SUPA.client.auth.onAuthStateChange(function(ev, session){
          if(session && session.user) Auth.mirrorSession(session.user);
          if(ev === "SIGNED_OUT") Auth.logout();
          if(ev === "SIGNED_IN" || ev === "INITIAL_SESSION"){
            // Attach an application submitted before the confirmation email was opened.
            setTimeout(function(){ Auth.flushPendingApplication(); }, 800);
          }
        });
      }catch(_){}
    });
  }catch(_){}
})();
