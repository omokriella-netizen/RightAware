/* RightAware AI client (v3).
   LIVE: POST {message, context} to RA_CONFIG.AI_ENDPOINT (/api/ai/chat) — the
   server holds AI_API_KEY, grounds answers in the verified knowledge base and
   enforces the no-fabrication rules. When the service is off (501) or fails
   (429/502/network), the client falls back to the on-device knowledge base and
   LABELS the answer (demo:true) — a fallback is never presented as an AI answer.
   The client NEVER holds an AI key. Every answer carries the legal-info disclaimer.
   The assistant must never claim to be a lawyer and never fabricate citations.
   The Supabase session token is attached when one exists — a configured AI key
   is only spendable by signed-in callers (401 otherwise). */
(function(){
  const DISCLAIMER = "General legal information only — not legal advice. Verify important points with a qualified professional.";
  function localKB(q){
    const s = (q||"").toLowerCase();
    const D = window.RA_RIGHTS_DETAIL || window.RA_RIGHTS || [];
    const hit = D.find(r => ((r.title+" "+(r.summary||"")+" "+(r.keywords||"")).toLowerCase().split(/[^a-z]+/).some(w => w.length>3 && s.includes(w))));
    return hit || null;
  }
  /* Shared labelled fallback used only in server mode (demo-kb mode below keeps
     its original wording untouched). */
  function serverFallback(m){
    const hit = localKB(m);
    if(hit){
      const url = hit.fullGuide || ("rights/topic.html?id="+hit.id);
      return { text:"The AI service isn’t available right now. Based on your words, start here: “"+hit.title+"” — "+(hit.summary||""), links:[{t:"Open: "+hit.title,u:url},{t:"Get Help",u:"help.html"}], disclaimer:DISCLAIMER, demo:true };
    }
    return { text:"The AI service isn’t available right now. Try keywords like arrest, rent, salary, vote, scam — or browse the library.", links:[{t:"Search all content",u:"search.html?q="+encodeURIComponent(m)},{t:"Browse rights library",u:"rights.html"}], disclaimer:DISCLAIMER, demo:true };
  }
  const AI = {
    _down: false,
    mode(){ return (window.RA_FEATURES && RA_FEATURES.aiConnected && RA_CONFIG.AI_ENDPOINT && !this._down) ? "server" : "demo-kb"; },
    async ask(message){
      const m = (message||"").trim();
      if(!m) return { text:"Please describe your issue in a few words.", links:[], disclaimer:DISCLAIMER };
      if(this.mode()==="server"){
        let data = null;
        try{
          /* Attach the Supabase session token when one exists: a configured AI
             key is only spendable by signed-in callers (401 otherwise). */
          const headers = {"Content-Type":"application/json"};
          try{
            if(window.RA_SUPA && RA_SUPA.ready && RA_SUPA.client && RA_SUPA.client.auth){
              const s = await RA_SUPA.client.auth.getSession();
              const tok = s && s.data && s.data.session && s.data.session.access_token;
              if(tok) headers["Authorization"] = "Bearer " + tok;
            }
          }catch(_){}
          const res = await fetch(RA_CONFIG.AI_ENDPOINT, { method:"POST", headers:headers, body:JSON.stringify({ message:m }) });
          try{ data = await res.json(); }catch(_){ data = null; }
          if(res.ok && data && data.text){
            return { text:String(data.text), links:data.links||[], sources:data.sources||[], disclaimer:data.disclaimer||DISCLAIMER };
          }
          /* 501 = the key is not configured server-side; 401 = the server
             requires a signed-in account. Either way stop calling for this
             session and fall back. 429/502 are transient: fall back without
             disabling the server for later questions. */
          if(res.status===501 || res.status===401 || (data && (data.code==="not_configured" || data.code==="unauthorized"))) this._down = true;
        }catch(_){ /* network/provider trouble — fall back below */ }
        return serverFallback(m);
      }
      const hit = localKB(m);
      if(hit){
        const url = hit.fullGuide || ("rights/topic.html?id="+hit.id);
        return { text:"Based on your words, start here: “"+hit.title+"” — "+(hit.summary||""), links:[{t:"Open: "+hit.title, u:url},{t:"Get Help", u:"help.html"}], disclaimer:DISCLAIMER, demo:true };
      }
      return { text:"I couldn't match that to a guide. Try keywords like arrest, rent, salary, vote, scam — or browse the library.", links:[{t:"Search all content",u:"search.html?q="+encodeURIComponent(m)},{t:"Browse rights library",u:"rights.html"}], disclaimer:DISCLAIMER, demo:true };
    }
  };
  window.RA_AI = AI;
})();
