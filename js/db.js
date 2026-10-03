/* RightAware storage layer (v5): localStorage-first — everything works offline
   and survives reloads. When you are signed in, Supabase is the source of
   truth: saved items, your profile and the contact-message queue sync with
   your account (remote.syncNow, per-account via ra_sync_owner). Consultations
   sync too when you are signed in: a real row the target professional accepts
   or declines (ra_consultations_remote mirrors the account's rows;
   device-local receipts stay separate). Settings and reviews stay
   device-local. Each local method mirrors its Supabase table — see DATABASE.md.
   Collections: ra_saved(+ra_removed tombstones, +ra_saved_base snapshot),
   ra_reviews(+queue), ra_consultations(+ra_consultations_remote mirror),
   ra_messages, ra_notifications, ra_reports, ra_requests,
   ra_profile(+ra_profile_base), ra_settings. */
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
      let item = null;
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
        item = { type, ref, title, at:new Date().toISOString() };
        list.push(item);
        // Saving again cancels any queued removal for the same row — a
        // re-adding device must never have its item deleted by an old tombstone.
        try{
          const t = LS.get("ra_removed", []);
          if(t.length){
            const keepT = t.filter(x => !(x.type===type && x.ref===ref));
            if(keepT.length !== t.length) LS.set("ra_removed", keepT);
          }
        }catch(_){}
      }
      LS.set("ra_saved", list);
      // Sync the change at once when signed in; failures retry on the next syncNow().
      // Only THIS row is sent — never the whole list (which could re-upload rows
      // the account removed elsewhere).
      try{
        if(this.remote && this.remote.ready() && this.remote.uid()){
          let p = i<0 ? this.remote.pushSaved([item]) : this.remote.deleteSaved(type, ref);
          if(p && p.catch) p.catch(function(){});
        }
      }catch(_){}
      return i<0;
    },
    // ---- Consultations ----
    // Local receipts (below) are the offline / signed-out / demo view.
    consultations(){ return LS.get("ra_consultations", []); },
    addConsultation(c){ const all=this.consultations(); c.id=uid(); c.at=new Date().toISOString(); c.status=c.status||"requested"; c.payment=c.payment||{status:"none"}; all.unshift(c); LS.set("ra_consultations", all); return c; },
    // Signed-in pages read this instead: the local mirror of the account's
    // REAL rows in Supabase — empty until the first sync lands, and never
    // mixed with the device-local receipts above.
    consultationsLive(){ return LS.get("ra_consultations_remote", []); },
    // ---- Contact messages ----
    messages(){ return LS.get("ra_messages", []); },
    addMessage(m){ const all=this.messages(); m.id=uid(); m.at=new Date().toISOString(); m.status="stored-local"; all.unshift(m); LS.set("ra_messages", all); return m; },
    // ---- Notifications ----
    // Local copy: the offline/demo view (welcome note included). Signed-in
    // pages use notificationsLive() instead — Supabase is the source of truth
    // and the welcome note is never mixed into account rows.
    notifications(){ return LS.get("ra_notifications", [
      { id:"welcome", title:"Welcome to RightAware", body:"Rights guides work offline. Signed in? Your saved items, profile and application status sync with your account.", at:new Date().toISOString(), read:false }
    ]); },
    // Signed-in pages read this instead: the local mirror of the account's
    // rows in Supabase (no welcome note) — empty until the first sync lands.
    notificationsLive(){ return LS.get("ra_notifications", []); },
    markRead(id){ const n=this.notifications().map(x=>x.id===id?Object.assign(x,{read:true}):x); LS.set("ra_notifications", n); },
    markUnread(id){ const n=this.notifications().map(x=>x.id===id?Object.assign(x,{read:false}):x); LS.set("ra_notifications", n); },
    markAllRead(){ const n=this.notifications().map(x=>Object.assign(x,{read:true})); LS.set("ra_notifications", n); },
    removeNotification(id){ const n=this.notifications().filter(x=>x.id!==id); LS.set("ra_notifications", n); },
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
  DB.v = "db6";   // code-version marker: production must run db6 (db5 sync engine + auth-flow hardening)

  /* ---- Supabase remote (used when RA_SUPA is ready; local-first otherwise) ----
     Local collections stay the offline cache; syncNow() mirrors them to Supabase
     tables (see DATABASE.md). Contact messages use the anon-insert policy, so
     they deliver even before login. Failures never break local use. */
  DB.remote = {
    ready(){ try{ return !!(window.RA_SUPA && RA_SUPA.ready && RA_SUPA.client); }catch(_){ return false; } },
    uid(){ try{ var u = (window.RA_AUTH && RA_AUTH.current()) || {}; return u.supabaseId || null; }catch(_){ return null; } },
    async pushSaved(list){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      var self = this;
      try{
        // Only the rows passed in (the sync passes what this device ADDED since
        // its last pull; a save passes just the new row). Never the whole local
        // list — that would re-upload items the account removed elsewhere.
        var src = (list && list.length !== undefined) ? list : DB.savedList();
        var rows = src.map(function(s){ return { user_id:self.uid(), item_type:s.type, ref:s.ref, title:s.title }; });
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
        var server = ((r.data) || []).map(function(x){ return { type:x.item_type, ref:x.ref, title:x.title, at:new Date().toISOString() }; });
        var key = function(s){ return s.type + "|" + s.ref; };
        // 3-way merge against ra_saved_base (the server snapshot this device last
        // pulled): the account copy is the truth, but (1) items ADDED here since
        // that snapshot stay even if their push has not landed yet, and (2) rows
        // this device REMOVED since the snapshot are excluded, so a failed delete
        // cannot be restored by this pull (no stale-local resurrection).
        var local = null;
        try{
          var raw = localStorage.getItem("ra_saved");
          if(raw !== null){ var parsed = JSON.parse(raw); if(parsed && parsed.length !== undefined) local = parsed; }
        }catch(_){ local = null; }
        var out;
        if(!local){
          // No local list at all (first sign-in, storage cleared or account
          // switch): adopt the account copy exactly as it is, delete nothing.
          out = server;
        } else {
          var base = [];
          try{ var braw = localStorage.getItem("ra_saved_base"); if(braw){ var bp = JSON.parse(braw); if(bp && bp.length !== undefined) base = bp; } }catch(_){ base = []; }
          var baseKeys = {}, localKeys = {}, serverKeys = {};
          base.forEach(function(s){ baseKeys[key(s)] = 1; });
          local.forEach(function(s){ localKeys[key(s)] = 1; });
          server.forEach(function(s){ serverKeys[key(s)] = 1; });
          var removedKeys = {};
          base.forEach(function(s){ if(!localKeys[key(s)]) removedKeys[key(s)] = 1; });
          out = server.filter(function(s){ return !removedKeys[key(s)]; });
          local.forEach(function(s){
            if(!baseKeys[key(s)] && !serverKeys[key(s)]) out.push(s);   // added here, push pending
          });
        }
        try{ localStorage.setItem("ra_saved", JSON.stringify(out)); }catch(_){}
        // Server snapshot this state is reconciled against — the base for the
        // next sync's add/remove diff (same idea as ra_profile_base for CAS).
        try{ localStorage.setItem("ra_saved_base", JSON.stringify(server)); }catch(_){}
        return { ok:true, pulled:server.length };
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
      if(!this.uid()) return { ok:false, error:"login required" };
      var pid = c && c.professionalId;
      if(!pid)
        return { ok:false, error:"no verified professional selected — a real request must name the professional it is addressed to" };
      try{
        var r = await RA_SUPA.client.from("consultations").insert({
          user_id:this.uid(), professional_id:pid,
          message:(c.msg || ""), status:"requested" }).select("id,professional_id,status,created_at").single();
        if(r.error){
          var m = r.error.message || "";
          // RLS refused the row (own_cons_ins): only a signed-in user may
          // request, and only against a VERIFIED professional — say so
          // honestly instead of pretending the request went through.
          if(r.error.code === "42501" || r.error.code === "42503" || /row-level security|permission denied/i.test(m))
            return { ok:false, error:"the database refused this request — it goes through only when you are signed in and the professional is verified on the directory (" + m + ")" };
          if(r.error.code === "23503" || /foreign key/i.test(m))
            return { ok:false, error:"that professional record no longer exists — reload the directory and try again" };
          return { ok:false, error:m };
        }
        return { ok:true, id:r.data && r.data.id };
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
        var r = await RA_SUPA.client.from("notifications")
          .select("id,title,body,read,created_at")
          .eq("user_id", this.uid())
          .order("created_at", { ascending:false })
          .limit(100);
        if(r.error) return { ok:false, error:r.error.message };
        // Server copy is the SOURCE OF TRUTH: the mirror is replaced, not
        // merged — a read ticked on another device sticks, and a notification
        // deleted elsewhere disappears here too (RLS own_notif scopes every
        // row to its account, so this list can only ever be your own).
        var server = ((r.data) || []).map(function(n){
          return { id:n.id, title:n.title, body:n.body, at:n.created_at, read:!!n.read };
        });
        try{ localStorage.setItem("ra_notifications", JSON.stringify(server)); }catch(_){}
        var unread = server.filter(function(n){ return !n.read; }).length;
        try{
          var c = await RA_SUPA.client.from("notifications")
            .select("id", { count:"exact", head:true })
            .eq("user_id", this.uid()).eq("read", false);
          if(c && !c.error && typeof c.count === "number") unread = c.count;
        }catch(_){}
        return { ok:true, pulled:server.length, unread:unread };
      }catch(_){ return { ok:false, error:"sync failed" }; }
    },
    async pullConsultations(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("consultations")
          .select("id,professional_id,message,status,payment_reference,created_at")
          .eq("user_id", this.uid())
          .order("created_at", { ascending:false })
          .limit(100);
        if(r.error) return { ok:false, error:r.error.message };
        // Server copy is the SOURCE OF TRUTH when signed in (policy
        // own_cons_sel scopes every visible row to this account): the mirror
        // is replaced, not merged. Device-local demo receipts live in their
        // own key and are never mixed in — same rule as notifications.
        var server = ((r.data) || []).map(function(x){
          return { id:x.id, professionalId:x.professional_id, to:null,
                   msg:(x.message || ""), status:x.status,
                   payment:(x.payment_reference ? { status:"reference", ref:x.payment_reference } : { status:"none" }),
                   at:x.created_at, live:true };
        });
        try{ localStorage.setItem("ra_consultations_remote", JSON.stringify(server)); }catch(_){}
        return { ok:true, pulled:server.length };
      }catch(_){ return { ok:false, error:"sync failed" }; }
    },
    /* Read-state and delete writes, each verified by a fresh server re-read
       before any success is reported (own_notif decides whether the row was
       actually yours — a blocked write reports honestly instead of pretending). */
    async setNotifRead(id, read){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("notifications").update({ read: !!read }).eq("id", id);
        if(r.error) return { ok:false, error:r.error.message };
        var again = await this.pullNotifications();
        if(!again.ok) return { ok:false, error:"saved, but re-reading failed: " + again.error };
        var list = []; try{ list = JSON.parse(localStorage.getItem("ra_notifications") || "[]"); }catch(_){}
        var row = null;
        for(var i = 0; i < list.length; i++){ if(list[i].id === id){ row = list[i]; break; } }
        if(!row || !!row.read !== !!read)
          return { ok:false, error:"the update did not persist — policy own_notif keeps rows outside your account untouched" };
        return { ok:true, unread: again.unread };
      }catch(_){ return { ok:false, error:"update failed" }; }
    },
    async markAllNotifsRead(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("notifications")
          .update({ read: true }).eq("user_id", this.uid()).eq("read", false);
        if(r.error) return { ok:false, error:r.error.message };
        var again = await this.pullNotifications();
        if(!again.ok) return { ok:false, error:"saved, but re-reading failed: " + again.error };
        if(again.unread !== 0)
          return { ok:false, error:"the update did not persist — " + again.unread + " unread remain (policy own_notif)" };
        return { ok:true, unread:0 };
      }catch(_){ return { ok:false, error:"update failed" }; }
    },
    async deleteNotif(id){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      try{
        var r = await RA_SUPA.client.from("notifications").delete().eq("id", id);
        if(r.error) return { ok:false, error:r.error.message };
        var again = await this.pullNotifications();
        if(!again.ok) return { ok:false, error:"deleted, but re-reading failed: " + again.error };
        var list = []; try{ list = JSON.parse(localStorage.getItem("ra_notifications") || "[]"); }catch(_){}
        var gone = true;
        for(var i = 0; i < list.length; i++){ if(list[i].id === id){ gone = false; break; } }
        if(!gone) return { ok:false, error:"the row is still there — policy own_notif keeps it in the owning account" };
        return { ok:true, unread: again.unread };
      }catch(_){ return { ok:false, error:"delete failed" }; }
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
            try{ ["ra_saved","ra_saved_base","ra_profile","ra_profile_dirty","ra_profile_base","ra_removed","ra_notifications","ra_consultations_remote"].forEach(function(k){ localStorage.removeItem(k); }); }catch(_){}
            out.savedPull = await this.pullSaved();
            out.profile = await this.pullProfile();
            // The previous account's notifications were just cleared — replace them
            // with THIS account's server copy right away (sync runs once per account
            // per page load, so skipping the pull would leave the list empty until
            // the next full page load). The consultation mirror is cleared and
            // refilled for exactly the same reason.
            out.notif = await this.pullNotifications();
            out.consult = await this.pullConsultations();
          } else {
            // 1) What did THIS device change since its last pull?
            //    ra_saved_base is the server snapshot that pull produced, so the
            //    local-vs-base diff is exactly: additions + removals made here.
            var localList = null;
            try{
              var lr = localStorage.getItem("ra_saved");
              if(lr !== null){ var lparsed = JSON.parse(lr); if(lparsed && lparsed.length !== undefined) localList = lparsed; }
            }catch(_){ localList = null; }
            var added = [], derivedRem = [], kOf = function(s){ return s.type + "|" + s.ref; };
            if(localList){
              var bList = [];
              try{ var br = localStorage.getItem("ra_saved_base"); if(br){ var bparsed = JSON.parse(br); if(bparsed && bparsed.length !== undefined) bList = bparsed; } }catch(_){ bList = []; }
              var lk = {}, bk = {};
              localList.forEach(function(s){ lk[kOf(s)] = 1; });
              bList.forEach(function(s){ bk[kOf(s)] = 1; });
              added = localList.filter(function(s){ return !bk[kOf(s)]; });
              derivedRem = bList.filter(function(s){ return !lk[kOf(s)]; });
            }
            // 2) Flush removals first (queued tombstones + rows dropped here since
            //    the last pull), so the pull below cannot restore them. A failed
            //    delete is retried next sync: the tombstone is kept, and a derived
            //    removal re-derives from the base while the server still has it.
            var tombs = LS.get("ra_removed", []), keep = [], seenRem = {};
            tombs.forEach(function(t){ seenRem[kOf(t)] = 1; });
            derivedRem.forEach(function(t){ if(!seenRem[kOf(t)]){ tombs.push(t); seenRem[kOf(t)] = 1; } });
            for(var ti = 0; ti < tombs.length; ti++){
              var del = await this.deleteSaved(tombs[ti].type, tombs[ti].ref);
              if(!del.ok) keep.push(tombs[ti]);          // retried on the next sync
            }
            try{ localStorage.setItem("ra_removed", JSON.stringify(keep.slice(-200))); }catch(_){}
            // 3) Push only the additions, then ALWAYS pull — the account copy must
            //    arrive even when this device's push failed (the merge keeps any
            //    additions whose push did not land, so nothing local is lost).
            out.saved = localList ? await this.pushSaved(added) : { ok:true, pushed:0 };
            out.savedPull = await this.pullSaved();
            var lp = DB.profile();
            out.profile = (DB.profileEdited() && (lp.name || lp.email || lp.phone))
              ? await this.pushProfile(lp)   // edited here → CAS push (a stale base never wins)
              : await this.pullProfile();    // otherwise the account copy is the truth
            out.notif = await this.pullNotifications();
            out.consult = await this.pullConsultations();
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
     session was restored would never sync at all. Signed-out visitors get ONE
     message-queue pass per page load too: contact.html queues undelivered
     messages locally and has no session layer, so without this the queue could
     only flush on a signed-in page. If a new event lands while a sync is still
     in flight, it re-runs afterwards instead of being dropped. */
  try{
    var syncedUid = null, syncedAnon = false, syncRunning = false, syncRetry = false;
    var runSync = function(){
      try{
        if(!DB.remote.ready()) return;
        var u = DB.remote.uid();
        if(u){ if(u === syncedUid) return; }
        else if(syncedAnon) return;
        if(syncRunning){ syncRetry = true; return; }   // re-checked when the flight lands
        syncRunning = true;
        Promise.resolve(DB.remote.syncNow())
          .then(function(){ if(u) syncedUid = u; else syncedAnon = true; }).catch(function(){})
          .then(function(){
            syncRunning = false;
            if(syncRetry){ syncRetry = false; try{ runSync(); }catch(_){} }
          });
      }catch(_){}
    };
    document.addEventListener("ra:backend-ready", runSync);
    document.addEventListener("ra:session-ready", runSync);
  }catch(_){}
})();
