/* RightAware ratings & reviews (v2) with safeguards.
   Rules enforced (client demo; mirrored by DB policies server-side later):
   - One published review per user per professional (updates replace).
   - Reviews start as "pending" when moderation is on (demo: auto-publish, flagged on report).
   - verifiedInteraction can only be set by the server after a real consultation.
   - reportReview() hides an item after N reports pending moderator review.
   Storage: localStorage today → professional_reviews table (DATABASE.md) later. */
(function(){
  const K = "ra_local_reviews", Q = "ra_review_queue";
  const get = (k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(_){ return d; } };
  const set = (k,v)=>{ try{localStorage.setItem(k, JSON.stringify(v));}catch(_){} };
  const REPORT_THRESHOLD = 3;
  const Reviews = {
    forProfessional(pid){
      const local = get(K, []).filter(r => r.pid===pid && r.status==="published");
      const seeded = ((window.RA_PROFESSIONALS||[]).find(p=>p.id===pid)||{reviews:[]}).reviews
        .filter(r => r.status==="published").map(r => Object.assign({ pid, seeded:true }, r));
      return seeded.concat(local).sort((a,b)=> (b.date||"").localeCompare(a.date||""));
    },
    submit(pid, rating, text){
      rating = Math.max(1, Math.min(5, +rating||5));
      text = (text||"").trim().slice(0, 1000);
      if(!text) return { ok:false, error:"Please write a short review." };
      const user = (window.RA_AUTH && RA_AUTH.current()) || { name:"Guest (demo)" };
      const all = get(K, []);
      const prev = all.findIndex(r => r.pid===pid && r.user===(user.name||user.email));
      const rec = { pid, user:user.name||user.email||"Anonymous", rating, text,
        date:new Date().toISOString().slice(0,10), verifiedInteraction:false,
        status:"published", reports:0, demo:true };
      if(prev>=0) all[prev]=rec; else all.push(rec);
      set(K, all);
      return { ok:true, message:"Review saved on this device (demo). Server moderation activates with Supabase." };
    },
    report(pid, user, date){
      const all = get(K, []);
      const r = all.find(x => x.pid===pid && x.user===user && (x.date||"")=== (date||""));
      if(r){ r.reports=(r.reports||0)+1; if(r.reports>=REPORT_THRESHOLD){ r.status="hidden-pending-review"; const q=get(Q,[]); q.push(r); set(Q,q);} set(K, all); }
      return "Thanks — the review was flagged for moderator review (demo queue on this device).";
    },
    queue(){ return get(Q, []); } // admin.html reads this
  };
  window.RA_REVIEWS = Reviews;
})();
