/* RightAware storage layer (v3): localStorage-first — everything works offline
   and survives reloads. When you are signed in, saved items, your profile and
   the contact-message queue sync with your account (remote.syncNow, per-account
   via ra_sync_owner). Consultations, settings and reviews stay device-local for
   now. Each local method mirrors its Supabase table — see DATABASE.md.
   Collections: ra_saved(+ra_removed tombstones), ra_reviews(+queue),
   ra_consultations, ra_messages, ra_notifications, ra_reports, ra_requests,
   ra_profile, ra_settings. */
(function(){
  const LS = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(_){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(_){ return false; } }
  };
  const uid = () => "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7);
  const DB = {
    backend: "local", // "supabase" when js/supabase-client connects (see DATABASE.md)
    // ---- Saved items (rights / laws / videos / resources) ----
    savedList(){ return LS.get("ra_saved", []); },
    isSaved(type, ref){ return this.savedList().some(s => s.type===type && s.ref===ref); },
    toggleSaved(type, ref, title){
      let list = this.savedList();
      const i = list.findIndex(s => s.type===type && s.ref===ref);
      if(i>=0){
        list.splice(i,1);
        // Offline-safe removal: once this device's saved list has been synced to
        // an account (ra_sync_owner set), queue a tombstone so the next pull
        // cannot restore a row removed here while offline.
        try{
          if(localStorage.getItem("ra_sync_owner")){
            const t = LS.get("ra_removed", []);
            t.push({ type, ref, at:new Date().toISOString() });
            LS.set("ra_removed", t.slice(-200));
          }
        }catch(_){}
      } else {
        list.push({ type, ref, title, at:new Date().toISOString() });
      }
      LS.set("ra_saved", list);
      // Sync the change at once when signed in; failures retry on the next syncNow().
      try{
        if(this.remote && this.remote.ready() && this.remote.uid()){
          let p = i<0 ? this.remote.pushSaved() : this.remote.deleteSaved(type, ref);
          if(p && p.catch) p.catch(function(){});
        }
      }catch(_){}
      return i<0;
    },
    // ---- Consultations ----
    consultations(){ return LS.get("ra_consultations", []); },
    addConsultation(c){ const all=this.consultations(); c.id=uid(); c.at=new Date().toISOString(); c.status=c.status||"requested"; c.payment=c.payment||{status:"none"}; all.unshift(c); LS.set("ra_consultations", all); return c; },
    // ---- Contact messages ----
    messages(){ return LS.get("ra_messages", []); },
    addMessage(m){ const all=this.messages(); m.id=uid(); m.at=new Date().toISOString(); m.status="stored-local"; all.unshift(m); LS.set("ra_messages", all); return m; },
    // ---- Notifications (local demo) ----
    notifications(){ return LS.get("ra_notifications", [
      { id:"welcome", title:"Welcome to RightAware", body:"Rights guides work offline. Signed in? Your saved items, profile and application status sync with your account.", at:new Date().toISOString(), read:false }
    ]); },
    markRead(id){ const n=this.notifications().map(x=>x.id===id?Object.assign(x,{read:true}):x); LS.set("ra_notifications", n); },
    pushNotification(t, b){ const n=this.notifications(); n.unshift({id:uid(),title:t,body:b,at:new Date().toISOString(),read:false}); LS.set("ra_notifications", n); },
    // ---- Profile & settings ----
    profile(){ return LS.get("ra_profile", { name:"", email:"", phone:"", state:"", language:"English" }); },
    saveProfile(p){ LS.set("ra_profile", p); try{ localStorage.setItem("ra_profile_dirty","1"); }catch(_){} },
    // Cross-device rule: the profile is PUSHED only when it was actually edited on
    // this device (saveProfile). Merely holding a local copy — which every synced
    // device does after its first pull — must never push, otherwise each device
    // keeps re-sending its own stale copy and overwrites newer edits made elsewhere.
    profileEdited(){ try{ return localStorage.getItem("ra_profile_dirty") === "1"; }catch(_){ return false; } },
    markProfileClean(){ try{ localStorage.removeItem("ra_profile_dirty"); }catch(_){} },
    settings(){ return LS.get("ra_settings", { reminders:true, offlineMode:true, language:"English" }); },
    saveSettings(s){ LS.set("ra_settings", s); }
  };
  window.RA_DB = DB;
  DB.v = "db4";   // code-version marker: production sync must run db4 (CAS profile sync)

  /* ---- Supabase remote (used when RA_SUPA is ready; local-first otherwise) ----
     Local collections stay the offline cache; syncNow() mirrors them to Supabase
     tables (see DATABASE.md). Contact messages use the anon-insert policy, so
     they deliver even before login. Failures never break local use. */
  DB.remote = {
    ready(){ try{ return !!(window.RA_SUPA && RA_SUPA.ready && RA_SUPA.client); }catch(_){ return false; } },
    uid(){ try{ var u = (window.RA_AUTH && RA_AUTH.current()) || {}; return u.supabaseId || null; }catch(_){ return null; } },
    async pushSaved(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      var self = this;
      try{
        var rows = DB.savedList().map(function(s){ return { user_id:self.uid(), item_type:s.type, ref:s.ref, title:s.title }; });
        if(!rows.length) return { ok:true, pushed:0 };
        var r = await RA_SUPA.client.from("saved_items").upsert(rows, { onConflict:"user_id,item_type,ref" });
        return r.error ? { ok:false, error:r.error.message } : { ok:true, pushed:rows.length };
      }catch(_){ return { ok:false, error:"save failed" }; }
    },
    async pullSaved(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("saved_items").select("item_type,ref,title").eq("user_id", this.uid());
        if(r.error) return { ok:false, error:r.error.message };
        var list = ((r.data) || []).map(function(x){ return { type:x.item_type, ref:x.ref, title:x.title, at:new Date().toISOString() }; });
        try{ localStorage.setItem("ra_saved", JSON.stringify(list)); }catch(_){}
        return { ok:true, pulled:list.length };
      }catch(_){ return { ok:false, error:"load failed" }; }
    },
    async deleteSaved(type, ref){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("saved_items").delete()
          .eq("user_id", this.uid()).eq("item_type", type).eq("ref", ref);
        return r.error ? { ok:false, error:r.error.message } : { ok:true };
      }catch(_){ return { ok:false, error:"delete failed" }; }
    },
    async pullProfile(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      // Remember the dirty flag from before the request: a save that lands while
      // this pull is in flight must NOT be overwritten or have its retry flag
      // cleared by the older server read.
      var dirtyBefore = null;
      try{ dirtyBefore = localStorage.getItem("ra_profile_dirty"); }catch(_){}
      try{
        var r = await RA_SUPA.client.from("profiles")
          .select("name,email,phone,state,language,updated_at").eq("id", this.uid()).limit(1);
        if(r.error) return { ok:false, error:r.error.message };
        var row = (r.data || [])[0];
        if(!row) return { ok:true, pulled:false };
        var dirtyNow = null;
        try{ dirtyNow = localStorage.getItem("ra_profile_dirty"); }catch(_){}
        if(dirtyNow !== dirtyBefore) return { ok:true, skipped:"edit-in-progress" };
        var p = { name:row.name || "", email:row.email || "", phone:row.phone || "",
                  state:row.state || "Lagos", language:row.language || "English" };
        try{ localStorage.setItem("ra_profile", JSON.stringify(p)); }catch(_){}
        // Server version this copy is based on — every push must match it (CAS).
        try{ localStorage.setItem("ra_profile_base", row.updated_at || ""); }catch(_){}
        DB.markProfileClean();                 // the account copy is now the local copy
        return { ok:true, pulled:true, profile:p };
      }catch(_){ return { ok:false, error:"pull failed" }; }
    },
    async pushConsultation(c){
      if(!this.ready()) return { ok:false, error:"backend not connected" };
      try{
        var r = await RA_SUPA.client.from("consultations").insert({
          user_id:this.uid(), professional_id:null,
          message:("To: " + (c.to || "Professional") + " | " + (c.msg || "")), status:"requested" }).select("id").single();
        return r.error ? { ok:false, error:r.error.message } : { ok:true, id:r.data && r.data.id };
      }catch(_){ return { ok:false, error:"request failed" }; }
    },
    async pushMessage(m){
      if(!this.ready()) return { ok:false, error:"backend not connected" };
      try{
        var r = await RA_SUPA.client.from("contact_messages").insert({
          name:m.name, email:m.email, topic:m.topic, message:m.msg }).select("id").single();
        return r.error ? { ok:false, error:r.error.message } : { ok:true, id:r.data && r.data.id };
      }catch(_){ return { ok:false, error:"send failed" }; }
    },
    async pushProfile(p){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      var uid = this.uid();
      var fields = { name:p.name, email:p.email, phone:p.phone, state:p.state, language:p.language };
      var base = null;
      try{ base = localStorage.getItem("ra_profile_base"); }catch(_){}
      try{
        if(base){
          // Compare-and-set: only overwrite the row this device last pulled.
          // 0 rows back means the account copy changed since (another device
          // saved a NEWER value) — a stale local copy must never win.
          var r = await RA_SUPA.client.from("profiles")
            .update(fields).eq("id", uid).eq("updated_at", base).select("updated_at");
          if(r.error) return { ok:false, error:r.error.message };
          if(r.data && r.data.length){
            try{ localStorage.setItem("ra_profile_base", r.data[0].updated_at || ""); }catch(_){}
            DB.markProfileClean();
            return { ok:true };
          }
          return await this.resolveProfileConflict();
        }
        // No base (never pulled): this is either the account's first profile row
        // or a copy we know nothing about. Insert if absent; if the row already
        // exists we cannot prove our copy is current — the account copy wins.
        var ins = await RA_SUPA.client.from("profiles")
          .insert(Object.assign({ id:uid }, fields)).select("updated_at");
        if(!ins.error && ins.data && ins.data.length){
          try{ localStorage.setItem("ra_profile_base", ins.data[0].updated_at || ""); }catch(_){}
          DB.markProfileClean();
          return { ok:true };
        }
        if(ins.error && /duplicate|23505|already exists/i.test(ins.error.message || ""))
          return await this.resolveProfileConflict();
        return { ok:false, error:(ins.error && ins.error.message) || "save failed" };
      }catch(_){ return { ok:false, error:"save failed" }; }
    },
    // Deterministic conflict rule: the server value that is NEWER than this
    // device's base wins. Pull it over the local copy, clear the edit flag and
    // tell the caller — never re-push the stale copy, never lose silently.
    async resolveProfileConflict(){
      try{ await this.pullProfile(); }catch(_){}
      return { ok:false, conflict:true, profile:DB.profile() };
    },
    async pullNotifications(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("notifications").select("id,title,body,read,created_at").eq("user_id", this.uid()).order("created_at", { ascending:false }).limit(20);
        if(r.error) return { ok:false, error:r.error.message };
        var local = []; try{ local = JSON.parse(localStorage.getItem("ra_notifications") || "[]"); }catch(_){}
        var seen = {}; local.forEach(function(n){ seen[n.id] = 1; });
        ((r.data) || []).forEach(function(n){ if(!seen[n.id]) local.unshift({ id:n.id, title:n.title, body:n.body, at:n.created_at, read:!!n.read }); });
        try{ localStorage.setItem("ra_notifications", JSON.stringify(local.slice(0, 50))); }catch(_){}
        return { ok:true, pulled:((r.data) || []).length };
      }catch(_){ return { ok:false, error:"sync failed" }; }
    },
    async syncNow(){
      if(!this.ready()) return { ok:false, error:"backend not connected (demo mode)" };
      var out = { ok:true };
      try{
        var m = DB.messages(); out.messages = 0;
        for(var i = 0; i < m.length; i++){
          if(m[i].status === "stored-local"){
            var pr = await this.pushMessage(m[i]);
            if(pr.ok){ m[i].status = "sent"; out.messages++; }
          }
        }
        try{ localStorage.setItem("ra_messages", JSON.stringify(m)); }catch(_){}
        if(this.uid()){
          var uidNow = this.uid(), owner = null;
          try{ owner = localStorage.getItem("ra_sync_owner"); }catch(_){}
          if(owner && owner !== uidNow){
            // A different account signed in on this device: never push the previous
            // account's local copies into this account — start from the server copy.
            try{ ["ra_saved","ra_profile","ra_profile_dirty","ra_profile_base","ra_removed","ra_notifications"].forEach(function(k){ localStorage.removeItem(k); }); }catch(_){}
            out.savedPull = await this.pullSaved();
            out.profile = await this.pullProfile();
          } else {
            // 1) flush queued removals first, so the pull below cannot restore them
            var tombs = LS.get("ra_removed", []), keep = [];
            for(var ti = 0; ti < tombs.length; ti++){
              var del = await this.deleteSaved(tombs[ti].type, tombs[ti].ref);
              if(!del.ok) keep.push(tombs[ti]);          // retried on the next sync
            }
            try{ localStorage.setItem("ra_removed", JSON.stringify(keep)); }catch(_){}
            // 2) push local saved + profile, then pull (a failed push never wipes
            //    device-only items; a pull only returns what we just sent)
            out.saved = await this.pushSaved();
            if(out.saved && out.saved.ok) out.savedPull = await this.pullSaved();
            var lp = DB.profile();
            out.profile = (DB.profileEdited() && (lp.name || lp.email || lp.phone))
              ? await this.pushProfile(lp)   // edited here → CAS push (a stale base never wins)
              : await this.pullProfile();    // otherwise the account copy is the truth
            out.notif = await this.pullNotifications();
          }
          try{ localStorage.setItem("ra_sync_owner", uidNow); }catch(_){}
        }
      }catch(_){ out.ok = false; out.error = "sync interrupted"; }
      // Let the page repaint from the just-synced local copy (account.html listens).
      try{ document.dispatchEvent(new CustomEvent("ra:synced", { detail: out })); }catch(_){}
      return out;
    }
  };
  /* Sync once per account per page load: at backend-ready, and again if the
     session only becomes known afterwards (js/auth.js fires "ra:session-ready"
     after it mirrors a session) — otherwise a page loaded just before the
     session was restored would never sync at all. */
  try{
    var syncedUid = null, syncRunning = false;
    var runSync = function(){
      try{
        if(!DB.remote.ready()) return;
        var u = DB.remote.uid();
        if(!u || u === syncedUid || syncRunning) return;
        syncRunning = true;
        Promise.resolve(DB.remote.syncNow())
          .then(function(){ syncedUid = u; }).catch(function(){})
          .then(function(){ syncRunning = false; });
      }catch(_){}
    };
    document.addEventListener("ra:backend-ready", runSync);
    document.addEventListener("ra:session-ready", runSync);
  }catch(_){}
})();
