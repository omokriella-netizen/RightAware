/* RightAware CAPTCHA — Cloudflare Turnstile (public site key only).
   SECURITY MODEL — the SECRET key never reaches this file or any page:
   * Browser gets only the public TURNSTILE_SITE_KEY (window.__ENV__ / env.local.js).
   * The secret lives in the Supabase Auth configuration
     (Dashboard → Authentication → Settings → CAPTCHA provider = Turnstile),
     where Supabase verifies the token server-side on the auth endpoints
     (together with the captcha_token this module hands to RA_AUTH).
   * Nothing here invents keys: with no site key configured the forms run
     without a widget (matching a Supabase project with CAPTCHA disabled).
   See docs/ENVIRONMENT.md for setup. */
(function(){
  var SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var loading = null;
  var mounted = []; // { el, widgetId, token }

  function siteKey(){
    try{ return (window.RA_CONFIG && RA_CONFIG.TURNSTILE_SITE_KEY) || (window.__ENV__ && window.__ENV__.TURNSTILE_SITE_KEY) || ""; }catch(_){ return ""; }
  }
  function find(el){
    for(var i = 0; i < mounted.length; i++){ if(mounted[i].el === el) return mounted[i]; }
    return null;
  }
  function loadScript(){
    if(window.turnstile) return Promise.resolve(window.turnstile);
    if(loading) return loading;
    loading = new Promise(function(res, rej){
      var s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = function(){ res(window.turnstile); };
      s.onerror = function(){ loading = null; rej(new Error("CAPTCHA script could not load")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  window.RA_TURNSTILE = {
    configured: function(){ return !!siteKey(); },

    /* Render the widget into a page container. Resolves {ok, unconfigured?, error?}. */
    mount: function(el){
      var key = siteKey();
      if(!key || !el) return Promise.resolve({ ok:true, unconfigured:true });
      if(find(el)) return Promise.resolve({ ok:true });
      return loadScript().then(function(ts){
        var rec = { el: el, widgetId: null, token: null };
        mounted.push(rec);
        rec.widgetId = ts.render(el, {
          sitekey: key,
          size: "normal",
          callback: function(t){ rec.token = t; },
          "expired-callback": function(){ rec.token = null; },
          "error-callback": function(){ rec.token = null; }
        });
        return { ok: true };
      }).catch(function(e){ return { ok:false, error: e.message }; });
    },

    /* Resolve a token for the widget in `el`.
       → string token | null (null = unconfigured, or the check is not solved yet) */
    token: function(el){
      var key = siteKey();
      if(!key) return Promise.resolve(null);
      var rec = find(el);
      if(!rec || !window.turnstile) return Promise.resolve(null);
      if(rec.token) return Promise.resolve(rec.token);
      try{
        var t = window.turnstile.getResponse(rec.widgetId);
        if(t){ rec.token = t; return Promise.resolve(t); }
        window.turnstile.execute(rec.widgetId);
      }catch(_){}
      return new Promise(function(res){
        var waited = 0;
        var iv = setInterval(function(){
          waited += 100;
          var cur = rec.token;
          try{ cur = cur || window.turnstile.getResponse(rec.widgetId); }catch(_){}
          if(cur){ clearInterval(iv); res(cur); }
          else if(waited > 8000){ clearInterval(iv); res(null); }
        }, 100);
      });
    },

    /* Submit gate: → { token, unconfigured } to proceed,
       or { blocked:true, error? } when a configured CAPTCHA was not solved. */
    gate: function(el){
      if(!siteKey()) return Promise.resolve({ token:null, unconfigured:true });
      if(!el) return Promise.resolve({ token:null, unconfigured:true });
      var self = this;
      return this.mount(el).then(function(m){
        if(!m.ok) return { blocked:true, error: m.error };
        return self.token(el).then(function(t){
          return t ? { token: t } : { blocked:true };
        });
      });
    }
  };
})();
