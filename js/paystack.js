/* RightAware Paystack integration stub (v2) — NO SECRETS in frontend.
   Flow (goes live only after backend setup):
   1. requestPayment({service, amountKobo, email}) → POST /api/paystack/initialize
      (server uses PAYSTACK_SECRET_KEY, returns authorization_url + reference).
   2. User pays on Paystack's page → redirected back with ?reference=....
   3. Client calls /api/paystack/verify?reference=... → server verifies with Paystack
      and ONLY then records payment status successful/failed/pending.
   Until then, initiate() returns a clear "not configured" message and the UI
   disables paid actions. See DEPLOYMENT.md + ENVIRONMENT.md. Amounts in kobo. */
(function(){
  const Pay = {
    configured(){ return false; /* becomes: backend route live && publishable key set */ },
    async initiate(opts){
      if(!this.configured()){
        return { ok:false, error:"Payments are not configured yet. Paystack keys must be added server-side first (see ENVIRONMENT.md). No charge was made." };
      }
    },
    async verify(reference){
      return { ok:false, error:"Verification requires the server route /api/paystack/verify (not configured)." };
    },
    history(){ try{ return JSON.parse(localStorage.getItem("ra_payments")||"[]"); }catch(_){ return []; } }
    // Server records canonical payment rows in the payments table (DATABASE.md).
  };
  window.RA_PAY = Pay;
})();
