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
})();
