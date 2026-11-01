/* RightAware CAPTCHA — Cloudflare Turnstile disabled.
   No-op compatibility shim provided so existing cached references or SW checks resolve cleanly. */
(function(){
  window.RA_TURNSTILE = {
    configured: function(){ return false; },
    mount: function(){ return Promise.resolve({ ok: true, unconfigured: true }); },
    token: function(){ return Promise.resolve(null); },
    gate: function(){ return Promise.resolve({ token: null, unconfigured: true }); },
    reset: function(){},
    unmount: function(){},
    hasError: function(){ return false; },
    getStatus: function(){ return { configured: false, ready: false }; }
  };
})();
