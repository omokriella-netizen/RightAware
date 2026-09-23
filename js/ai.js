/* RightAware AI client (v2).
   DEMO: answers from the on-device knowledge base (rights summaries + page links).
   LIVE (later): POST {message, context} to RA_CONFIG.AI_ENDPOINT (e.g. /api/ai/chat),
   which holds the AI_API_KEY server-side and grounds answers in verified content.
   The client NEVER holds an AI key. Every answer carries the legal-info disclaimer.
   The assistant must never claim to be a lawyer and never fabricate citations. */
(function(){
  const DISCLAIMER = "General legal information only — not legal advice. Verify important points with a qualified professional.";
  function localKB(q){
    const s = (q||"").toLowerCase();
    const D = window.RA_RIGHTS_DETAIL || window.RA_RIGHTS || [];
    const hit = D.find(r => ((r.title+" "+(r.summary||"")+" "+(r.keywords||"")).toLowerCase().split(/[^a-z]+/).some(w => w.length>3 && s.includes(w))));
    return hit || null;
  }
  const AI = {
    mode(){ return (window.RA_FEATURES && RA_FEATURES.aiConnected && RA_CONFIG.AI_ENDPOINT) ? "server" : "demo-kb"; },
    async ask(message){
      const m = (message||"").trim();
      if(!m) return { text:"Please describe your issue in a few words.", links:[], disclaimer:DISCLAIMER };
      if(this.mode()==="server"){
        try{
          const res = await fetch(RA_CONFIG.AI_ENDPOINT, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message:m }) });
          if(!res.ok) throw new Error("AI service unavailable ("+res.status+")");
          const data = await res.json();
          return { text:data.text||"No answer returned.", links:data.links||[], disclaimer:DISCLAIMER };
        }catch(e){ return { text:"The AI service is unreachable right now. Try the library or Get Help.", links:[{t:"Browse rights library",u:"rights.html"},{t:"Get Help",u:"help.html"}], disclaimer:DISCLAIMER }; }
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
