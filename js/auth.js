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
    // isAdmin() removed (dead code): admin gating is RLS-backed server-side and
    // every page checks RA_AUTH.current().role directly.
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
  /* The REAL Supabase session — never the local mirror. The mirror can hold an
     old device login (no supabaseId) while a Supabase session exists, or a
     stale id after sign-out, so anything that LINKS data to an applicant
     (application rows, own-row reads) must ask the session itself. Returns
     {id,email}, optionally requiring the session e-mail to match an address,
     or null when nobody is signed in. */
  Auth.liveUser = async function(matchEmail){
    try{
      if(!this.supabaseReady()) return null;
      var r = await RA_SUPA.client.auth.getSession();
      var u = r && r.data && r.data.session && r.data.session.user;
      if(!u || !u.id) return null;
      if(matchEmail != null && String(matchEmail) !== "" &&
         String(u.email || "").toLowerCase() !== String(matchEmail || "").toLowerCase()) return null;
      return { id:String(u.id), email:String(u.email || "") };
    }catch(_){ return null; }
  };
  /* Application status for the signed-in user (professional/org pathways).
     Returns null when nothing is found or the add-on policies are not applied. */
  Auth.myApplication = async function(){
    if(!this.supabaseReady()) return null;
    var errs = [];
    try{
      var live = await this.liveUser();
      var uid = live ? live.id : ((this.current()||{}).supabaseId || "");
      var pro = await RA_SUPA.client.from("professionals")
        .select("id,name,verification_status,qualification,location,created_at")
        .eq("user_id", uid || "").limit(1);
      if(pro && !pro.error && pro.data && pro.data.length) return { path:"professional", row:pro.data[0] };
      if(pro && pro.error) errs.push((pro.error.message || String(pro.error)) + " (professionals)");
    }catch(e){ errs.push(((e && e.message) || String(e)) + " (professionals)"); }
    try{
      var email = (this.current()||{}).email;
      if(email){
        // Case-insensitive exact match (the account email is normalised by
        // Supabase; the form captured it as typed). Pattern chars are escaped
        // so "john_doe@x.com" never over-matches another address.
        var pat = String(email).replace(/([\\%_])/g, "\\$1");
        var org = await RA_SUPA.client.from("organizations")
          .select("id,name,verification_status,created_at")
          .ilike("email", pat).limit(1);
        if(org && !org.error && org.data && org.data.length) return { path:"organisation", row:org.data[0] };
        if(org && org.error) errs.push((org.error.message || String(org.error)) + " (organizations)");
      }
    }catch(e){ errs.push(((e && e.message) || String(e)) + " (organizations)"); }
    // {error} = reads failed (report honestly); null = reads worked, no application.
    if(errs.length) return { error: errs.join("; ") };
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
     account automatically after the user confirms the email and signs in.
     Storage is a LIST keyed by table + applicant e-mail: a second application
     from the same browser must never overwrite (and silently destroy) an
     earlier applicant's payload — every stored payload survives until ITS
     applicant signs in and it flushes. The legacy single-slot key is migrated
     on read. */
  function appKey(x){ return String((x && x.table) || "") + "|" + String((x && x.email) || "").toLowerCase(); }
  Auth.savePendingApplication = function(p){
    try{
      var list = Auth.pendingApplications().filter(function(x){ return appKey(x) !== appKey(p); });
      list.push(p);
      localStorage.setItem("ra_pending_apps", JSON.stringify(list));
      localStorage.removeItem("ra_pending_app");   // legacy single slot retired
    }catch(_){}
  };
  Auth.pendingApplications = function(){
    try{
      var l = JSON.parse(localStorage.getItem("ra_pending_apps") || "[]");
      if(Array.isArray(l)){
        var live = l.filter(function(x){ return x && x.table && x.row; });
        if(live.length) return live;
        // An empty list falls through to the legacy key below: an old
        // single-slot payload must still migrate, never be stranded.
      }
    }catch(_){}
    try{ // migrate the legacy single-slot payload (pre-multi-app builds)
      var one = JSON.parse(localStorage.getItem("ra_pending_app") || "null");
      if(one && one.table && one.row){
        localStorage.setItem("ra_pending_apps", JSON.stringify([one]));
        localStorage.removeItem("ra_pending_app");
        return [one];
      }
    }catch(_){}
    return [];
  };
  Auth.pendingApplication = function(){ // newest stored payload (compatibility)
    var l = Auth.pendingApplications();
    return l.length ? l[l.length - 1] : null;
  };
  Auth.dropPendingApplication = function(p){
    try{
      var k = appKey(p);
      var rest = Auth.pendingApplications().filter(function(x){ return appKey(x) !== k; });
      if(rest.length) localStorage.setItem("ra_pending_apps", JSON.stringify(rest));
      else localStorage.removeItem("ra_pending_apps");
      localStorage.removeItem("ra_pending_app");
    }catch(_){}
  };
  Auth.flushPendingApplication = async function(){
    if(!this.supabaseReady()) return null;
    var list = this.pendingApplications();
    if(!list.length) return null;
    // The live session is the authority when one exists. A mirrored login only
    // decides WHEN NO SESSION resolves — and that path can never produce a
    // wrong link: every insert below then goes out unauthenticated and the
    // row-level policies refuse it (payload kept for the next real sign-in).
    var live = await this.liveUser();
    var me = this.current() || {};
    var who = live ? { id:String(live.id), email:String(live.email) }
            : (me && me.supabaseId && me.email
               ? { id:String(me.supabaseId), email:String(me.email) } : null);
    if(!who) return null;
    // Every payload names its applicant: attach ONLY the payload whose e-mail
    // matches the signed-in account — never another person's application.
    var mine = list.filter(function(p){
      var pe = p.email ? String(p.email).toLowerCase() : "";
      return !!pe && pe === String(who.email).toLowerCase();
    });
    if(!mine.length) return null;
    var first = null;
    for(var i = 0; i < mine.length; i++){
      var p = mine[i];
      try{
        var row = p.row;
        if(p.table === "professionals"){
          // Already recorded for this account? Then this payload is history:
          // keep the record that exists and retire the payload silently —
          // exactly the rule 23505 applies to, checked before we can even
          // form a second row. (A rejected/unverified row does NOT block a
          // legitimate re-application — only pending/approved records do.)
          var own = await RA_SUPA.client.from("professionals")
            .select("id, verification_status").eq("user_id", who.id)
            .in("verification_status", ["pending","verified"]).limit(1);
          if(own && !own.error && own.data && own.data.length){
            // Heal the record if its specialisation rows never attached.
            if(p.extraTable && Array.isArray(row.consultation_options) && row.consultation_options.length){
              try{
                var exHeal = await RA_SUPA.client.from(p.extraTable)
                  .upsert(row.consultation_options.map(function(s){ return { professional_id: row.id, specialization: s }; }),
                          { onConflict:"professional_id,specialization", ignoreDuplicates:true });
                if(exHeal && exHeal.error) throw new Error(exHeal.error.message);
              }catch(e){
                if(window.console && console.warn) console.warn("RightAware: specialisation rows not attached:", (e && e.message) || String(e));
                continue; // keep the payload: retry next sign-in
              }
            }
            this.dropPendingApplication(p);
            if(!first) first = { table:p.table, ref:p.ref || null };
            continue;
          }
          row.user_id = who.id;
        }
        // A payload saved while signed out carries no specialisation rows
        // (they could not be authorised then): rebuild them from the row's own
        // consultation options BEFORE the insert so both the success path and
        // the 23505 retry path below can attach a complete record.
        if(p.table === "professionals" && p.extraTable && (!p.extraRows || !p.extraRows.length)
           && Array.isArray(row.consultation_options) && row.consultation_options.length){
          p.extraRows = row.consultation_options.map(function(s){
            return { professional_id: row.id, specialization: s };
          });
        }
        var r = await RA_SUPA.client.from(p.table).insert(row);
        if(r.error){
          // 23505 = the row from an earlier sign-in already exists — make sure
          // its specialisation rows exist too (idempotent upsert), clear the
          // payload (no more retries) and stay quiet: nothing new attached.
          if(r.error.code === "23505"){
            if(p.extraTable && p.extraRows && p.extraRows.length){
              try{
                var ex0 = await RA_SUPA.client.from(p.extraTable)
                  .upsert(p.extraRows, { onConflict:"professional_id,specialization", ignoreDuplicates:true });
                if(ex0 && ex0.error) throw new Error(ex0.error.message);
              }catch(e){
                if(window.console && console.warn) console.warn("RightAware: specialisation rows not attached:", (e && e.message) || String(e));
                continue; // keep the payload: retry the specialisations next sign-in
              }
            }
            this.dropPendingApplication(p); if(!first) first = { table:p.table, ref:p.ref || null };
          }
          continue;                       // else: still not allowed — retry next sign-in
        }
        if(p.extraTable && p.extraRows && p.extraRows.length){
          try{
            var exr = await RA_SUPA.client.from(p.extraTable)
              .upsert(p.extraRows, { onConflict:"professional_id,specialization", ignoreDuplicates:true });
            if(exr && exr.error) throw new Error(exr.error.message);
          }catch(e){
            // The main row exists; the specialisation rows failed. Keep the
            // payload (retry next sign-in) and say so instead of vanishing.
            if(window.console && console.warn) console.warn("RightAware: specialisation rows not attached:", (e && e.message) || String(e));
            continue;
          }
        }
        this.dropPendingApplication(p);
        if(!first) first = { table:p.table, ref:p.ref || null };
      }catch(_){}
    }
    return first;
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
