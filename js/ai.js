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
     its original wording untouched). Never claim to be live AI. */
  function serverFallback(m){
    const hit = localKB(m);
    if(hit){
      const url = hit.fullGuide || ("rights/topic.html?id="+hit.id);
      return {
        text: "The live AI assistant is temporarily unavailable. Based on verified RightAware legal guides, here is key guidance on “" + hit.title + "”:\n\n" + (hit.summary || ""),
        links: [
          { t: "Open Guide: " + hit.title, u: url },
          { t: "Browse Rights Library", u: "rights.html" },
          { t: "Emergency Helplines", u: "help.html" }
        ],
        disclaimer: DISCLAIMER,
        demo: true,
        isFallback: true,
        sourceLabel: "Verified RightAware Guide"
      };
    }
    return {
      text: "The live AI assistant is temporarily unavailable. We could not find an exact keyword match, but you can explore verified Nigerian legal protections in our library below or contact official help desks.",
      links: [
        { t: "Search all content", u: "search.html?q=" + encodeURIComponent(m) },
        { t: "Browse rights library", u: "rights.html" },
        { t: "Emergency Helplines", u: "help.html" }
      ],
      disclaimer: DISCLAIMER,
      demo: true,
      isFallback: true,
      sourceLabel: "Verified RightAware Guide"
    };
  }
  const AI = {
    _downUntil: 0,       // 15-second cooldown timestamp — never permanently locks the browser session
    _authNeeded: false,  // 401 — a configured AI key is only spendable signed-in
    mode(){ return (window.RA_FEATURES && RA_FEATURES.aiConnected && RA_CONFIG.AI_ENDPOINT && Date.now() >= (this._downUntil || 0)) ? "server" : "demo-kb"; },
    async ask(message, opts){
      opts = opts || {};
      const m = (message||"").trim();
      if(!m) return { text:"Please describe your issue in a few words.", links:[], disclaimer:DISCLAIMER };
      if(this.mode()==="server"){
        let data = null;
        const capContainer = opts.captchaContainer || opts.captchaEl || document.querySelector("[data-captcha]");
        try{
          /* Attach the Supabase session token when one exists: a configured AI
             key is only spendable by signed-in callers (or 3 free attempts for verified guests). */
          const headers = {"Content-Type":"application/json"};
          let tok = null;
          try{
            if(window.RA_SUPA && RA_SUPA.ready && RA_SUPA.client && RA_SUPA.client.auth){
              const s = await RA_SUPA.client.auth.getSession();
              tok = s && s.data && s.data.session && s.data.session.access_token || null;
            }
          }catch(_){}
          if(tok){
            headers["Authorization"] = "Bearer " + tok;
            this._authNeeded = false;
          }

          const needAuth = function(customText){
            return {
              needsAuth: true,
              text: customText || (data && data.error) || "The AI assistant is available to signed-in RightAware accounts. Sign in to continue where you left off.",
              links: (data && data.links) || [{t:"Sign in", u:"login.html?next=ai.html"}, {t:"Create an account", u:"signup.html"}],
              disclaimer: DISCLAIMER,
              demo: true
            };
          };

          /* If not authenticated, check local quota latch first to save round-trip if already exhausted */
          if(!tok && window.RA_CHAT_STATE && window.RA_CHAT_STATE.hasReachedLimit()){
            return {
              limitReached: true,
              code: "free_limit_reached",
              attempts: window.RA_CHAT_STATE.getGuestPromptCount(),
              max: window.RA_CHAT_STATE.MAX_PREVIEWS || 3,
              text: "Free preview limit reached (3/3). Please sign in with a free RightAware account to continue where you left off with unlimited answers.",
              links: [{t:"Sign In & Continue", u:"login.html?next=ai.html"}, {t:"Create Free Account", u:"signup.html"}],
              disclaimer: DISCLAIMER
            };
          }

          /* 401-latched and still no session: answer honestly without another
             guaranteed-failing call. (ra:session-ready also clears the latch.) */
          if(this._authNeeded && !tok) return needAuth();

          /* Resolve Turnstile token for guest requests if Turnstile is active */
          let turnstileToken = opts.turnstileToken || null;
          let turnstileErrored = false;
          if(!tok && window.RA_TURNSTILE && capContainer){
            if(window.RA_TURNSTILE.hasError(capContainer)){
              turnstileErrored = true;
            } else if(!turnstileToken){
              try {
                turnstileToken = await window.RA_TURNSTILE.token(capContainer);
              } catch(_) {}
              if(!turnstileToken && window.RA_TURNSTILE.hasError(capContainer)){
                turnstileErrored = true;
              }
            }
          }

          const reqBody = {
            message: m,
            turnstileToken: turnstileToken || undefined,
            context: opts.context || undefined
          };

          const res = await fetch(RA_CONFIG.AI_ENDPOINT, {
            method: "POST",
            headers: headers,
            credentials: "same-origin",
            body: JSON.stringify(reqBody)
          });

          try{ data = await res.json(); }catch(_){ data = null; }

          // Sync guest attempts if server answered with guest metadata
          if(data && data.isGuest && data.guestAttempts != null && window.RA_CHAT_STATE){
            window.RA_CHAT_STATE.setGuestPromptCount(data.guestAttempts);
          }

          /* Defensive validation: only accept real successful answers.
             Never render diagnostic payloads or failed status objects to citizens. */
          if(res.ok && data && data.ok === true && data.text && !data.diagnostic){
            return {
              ok: true,
              text: String(data.text),
              links: data.links || [],
              sources: data.sources || [],
              disclaimer: data.disclaimer || DISCLAIMER,
              isGuest: !!data.isGuest,
              guestAttempts: data.guestAttempts,
              guestMax: data.guestMax
            };
          }

          /* 403 free_limit_reached: guest quota exhausted */
          if(data && (data.code === "free_limit_reached" || data.code === "quota_exhausted")){
            if(window.RA_CHAT_STATE){
              window.RA_CHAT_STATE.setGuestPromptCount(data.attempts || 3);
            }
            return {
              limitReached: true,
              code: "free_limit_reached",
              attempts: data.attempts || 3,
              max: data.max || 3,
              text: data.text || data.error || "Free preview limit reached (3/3). Sign in with a free account to continue asking unlimited questions.",
              links: data.links || [{t:"Sign In & Continue", u:"login.html?next=ai.html"}, {t:"Create Free Account", u:"signup.html"}],
              disclaimer: data.disclaimer || DISCLAIMER
            };
          }

          /* 403 captcha_required / captcha_invalid */
          if(data && (data.code === "captcha_required" || data.code === "captcha_invalid")){
            let errorText = "Security verification required. Please complete the CAPTCHA check to continue.";
            if(turnstileErrored){
              errorText = "Security verification could not connect (network or configuration block). You can sign in with a free account to continue asking questions without CAPTCHA.";
            } else if(data.code === "captcha_invalid"){
              errorText = "Security verification expired or was invalid. Please tick the verification box again.";
            } else {
              errorText = "Please complete the security check above before submitting your question.";
            }
            return {
              captchaNeeded: true,
              code: data.code,
              captchaErrored: turnstileErrored,
              text: errorText,
              links: turnstileErrored ? [{t:"Sign In Free (No CAPTCHA)", u:"login.html?next=ai.html"}, {t:"Create Free Account", u:"signup.html"}] : [],
              disclaimer: DISCLAIMER
            };
          }

          /* 429 rate_limited / too_many_requests */
          if(res.status === 429 || (data && (data.code === "rate_limited" || data.code === "too_many_requests"))){
            return {
              rateLimited: true,
              code: "rate_limited",
              text: (data && data.error) || "High traffic detected. Please wait a moment before trying again, or sign in.",
              links: [{t:"Sign in", u:"login.html?next=ai.html"}],
              disclaimer: DISCLAIMER
            };
          }

          /* 401 = the server requires a signed-in account. */
          if(res.status===401 || (data && data.code==="unauthorized")){
            this._authNeeded = true;
            return needAuth();
          }

          /* 501 / 502 / 503 or provider_unavailable / upstream failure:
             Trip 15-second cooldown and execute verified knowledge-base fallback. */
          if(res.status === 501 || res.status === 502 || res.status === 503 ||
             (data && (data.code === "provider_unavailable" || data.code === "service_unavailable" || data.code === "not_configured" || data.diagnostic === true || data.ok === false))){
            this._downUntil = Date.now() + 15000;
            return serverFallback(m);
          }

        }catch(_){
          this._downUntil = Date.now() + 15000;
          return serverFallback(m);
        }
        finally {
          /* Rotate Turnstile token so subsequent prompts do not attempt to reuse spent token */
          if(window.RA_TURNSTILE && capContainer){
            try { window.RA_TURNSTILE.reset(capContainer); } catch(_) {}
          }
        }
        return serverFallback(m);
      }
      const hit = localKB(m);
      if(hit){
        const url = hit.fullGuide || ("rights/topic.html?id="+hit.id);
        return { text:"Based on your words, start here: “"+hit.title+"” — "+(hit.summary||""), links:[{t:"Open: "+hit.title, u:url},{t:"Get Help", u:"help.html"}], disclaimer:DISCLAIMER, demo:true };
      }
      return { text:"I couldn't match that to a guide. Try keywords like arrest, rent, salary, vote, scam — or browse the library.", links:[{t:"Search all content",u:"search.html?q="+encodeURIComponent(m)},{t:"Browse rights library",u:"rights.html"}], disclaimer:DISCLAIMER, demo:true };
    },
    // previewAsk delegates directly to ask so guests get real AI answers on all preview attempts
    previewAsk(message, opts){
      return this.ask(message, opts);
    }
  };
  /* Signing in clears the 401 latch: the next question goes to the server again
     with the fresh session token. (501 stays latched — a session cannot fix a
     missing server key.) */
  try{ document.addEventListener("ra:session-ready", function(){ AI._authNeeded = false; }); }catch(_){}
  window.RA_AI = AI;
})();
