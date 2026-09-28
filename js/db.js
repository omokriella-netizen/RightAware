/* RightAware storage layer (v2): local-first, Supabase-ready.
   Today every collection persists in this browser's localStorage (works offline,
   survives reloads, never leaves the device). Each method mirrors the future
   Supabase table/API so swap-in is mechanical — see DATABASE.md for the schema.
   Collections: ra_saved, ra_reviews(+queue), ra_consultations, ra_messages,
   ra_notifications, ra_reports, ra_requests, ra_profile, ra_settings. */
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
      if(i>=0) list.splice(i,1); else list.push({ type, ref, title, at:new Date().toISOString() });
      LS.set("ra_saved", list); return i<0;
    },
    // ---- Consultations ----
    consultations(){ return LS.get("ra_consultations", []); },
    addConsultation(c){ const all=this.consultations(); c.id=uid(); c.at=new Date().toISOString(); c.status=c.status||"requested"; c.payment=c.payment||{status:"none"}; all.unshift(c); LS.set("ra_consultations", all); return c; },
    // ---- Contact messages ----
    messages(){ return LS.get("ra_messages", []); },
    addMessage(m){ const all=this.messages(); m.id=uid(); m.at=new Date().toISOString(); m.status="stored-local"; all.unshift(m); LS.set("ra_messages", all); return m; },
    // ---- Notifications (local demo) ----
    notifications(){ return LS.get("ra_notifications", [
      { id:"welcome", title:"Welcome to RightAware", body:"Core guides work offline. Backend features (sync, Hou professional messaging) arrive after Supabase setup.", at:new Date().toISOString(), read:false }
    ]); },
    markRead(id){ const n=this.notifications().map(x=>x.id===id?Object.assign(x,{read:true}):x); LS.set("ra_notifications", n); },
    pushNotification(t, b){ const n=this.notifications(); n.unshift({id:uid(),title:t,body:b,at:new Date().toISOString(),read:false}); LS.set("ra_notifications", n); },
    // ---- Profile & settings ----
    profile(){ return LS.get("ra_profile", { name:"", email:"", phone:"", state:"", language:"English" }); },
    saveProfile(p){ LS.set("ra_profile", p); },
    settings(){ return LS.get("ra_settings", { reminders:true, offlineMode:true, language:"English" }); },
    saveSettings(s){ LS.set("ra_settings", s); }
  };
  window.RA_DB = DB;

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
      var rows = DB.savedList().map(function(s){ return { user_id:self.uid(), item_type:s.type, ref:s.ref, title:s.title }; });
      if(!rows.length) return { ok:true, pushed:0 };
      var r = await RA_SUPA.client.from("saved_items").upsert(rows, { onConflict:"user_id,item_type,ref" });
      return r.error ? { ok:false, error:r.error.message } : { ok:true, pushed:rows.length };
    },
    async pullSaved(){
      if(!this.ready() || !this.uid()) return { ok:false, error:"login required" };
      var r = await RA_SUPA.client.from("saved_items").select("item_type,ref,title").eq("user_id", this.uid());
      if(r.error) return { ok:false, error:r.error.message };
      var list = ((r.data) || []).map(function(x){ return { type:x.item_type, ref:x.ref, title:x.title, at:new Date().toISOString() }; });
      try{ localStorage.setItem("ra_saved", JSON.stringify(list)); }catch(_){}
      return { ok:true, pulled:list.length };
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
      try{
        var r = await RA_SUPA.client.from("profiles").upsert({
          id:this.uid(), name:p.name, email:p.email, phone:p.phone, state:p.state, language:p.language });
        return r.error ? { ok:false, error:r.error.message } : { ok:true };
      }catch(_){ return { ok:false, error:"save failed" }; }
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
          out.saved = await this.pushSaved();
          // Only restore the server copy after a successful push, so a failed
          // push can never wipe items that exist only on this device.
          if(out.saved && out.saved.ok) out.savedPull = await this.pullSaved();
          out.profile = await this.pushProfile(DB.profile());
          out.notif = await this.pullNotifications();
        }
      }catch(_){ out.ok = false; out.error = "sync interrupted"; }
      return out;
    }
  };
  try{
    document.addEventListener("ra:backend-ready", function(){ try{ DB.remote.syncNow(); }catch(_){} });
  }catch(_){}
})();
