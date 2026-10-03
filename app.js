/* RightAware shared app JS: nav, search redirect, newsletter, footer year. */
(function(){
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function(){
    // Mobile nav
    var btn = document.getElementById("menuBtn"), nav = document.getElementById("mobileNav");
    if(btn && nav){
      btn.addEventListener("click", function(){
        var open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", function(){ nav.classList.remove("open"); }); });
    }
    // Active nav link
    var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav a, .mobile-nav a").forEach(function(a){
      var href = (a.getAttribute("href")||"").toLowerCase();
      if(href === page || (page==="" && href==="index.html")) a.classList.add("active");
    });
    // Header search -> search page
    document.querySelectorAll("form[data-global-search]").forEach(function(f){
      f.addEventListener("submit", function(e){
        e.preventDefault();
        var q = f.querySelector("input[type=search]").value.trim();
        var base = f.getAttribute("data-base") || "";
        location.href = base + "search.html?q=" + encodeURIComponent(q);
      });
    });
    // Newsletter demo
    document.querySelectorAll("form[data-newsletter]").forEach(function(f){
      f.addEventListener("submit", function(e){
        e.preventDefault();
        var email = f.querySelector("input[type=email]").value.trim();
        try{ var list = JSON.parse(localStorage.getItem("ra_newsletter")||"[]"); list.push({email:email, at:new Date().toISOString()}); localStorage.setItem("ra_newsletter", JSON.stringify(list)); }catch(_){}
        f.reset();
        var n = f.parentElement.querySelector(".newsletter-ok") || document.createElement("p");
        n.className = "newsletter-ok"; n.style.cssText = "color:#4ade80;font-size:.85rem";
        n.textContent = "Subscribed (saved on this device demo).";
        f.after(n);
      });
    });
    // Footer year
    document.querySelectorAll("[data-year]").forEach(function(el){ el.textContent = new Date().getFullYear(); });
    // Dynamic library counts — source: content/rights.js (RA_RIGHTS) + content/laws.js (RA_LAWS).
    // Markup uses <span data-rights-count>/<span data-guide-count>/<span data-laws-count>.
    try{
      var rightsNow = window.RA_RIGHTS || [];
      if(rightsNow.length){
        document.querySelectorAll("[data-rights-count]").forEach(function(el){ el.textContent = rightsNow.length; });
        var guideCount = rightsNow.filter(function(r){ return r.fullGuide; }).length;
        document.querySelectorAll("[data-guide-count]").forEach(function(el){ el.textContent = guideCount; });
      }
      var lawsNow = (window.RA_LAWS || []).filter(function(l){ return l.textAvailable; });
      if(lawsNow.length) document.querySelectorAll("[data-laws-count]").forEach(function(el){ el.textContent = lawsNow.length; });
    }catch(_){}
    // Reveal on scroll (light, fast)
    if("IntersectionObserver" in window){
      var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } }); }, {threshold:.08});
      document.querySelectorAll(".rv").forEach(function(el){ el.classList.add("rvh"); io.observe(el); });
    }
    // Service worker: offline-first core content (http(s) hosts only; skipped on file://)
    if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register("/sw.js").catch(function(e){ console.warn("[RA] service worker registration failed:", e); });
    }
    // Offline indicator (persistent banner while offline; live features pause)
    try{
      var bar = null;
      function paintNet(){
        var off = !navigator.onLine;
        if(off && !bar){
          bar = document.createElement("div");
          bar.setAttribute("role", "status");
          bar.style.cssText = "position:sticky;top:0;z-index:999;background:#7c2d12;color:#fff;text-align:center;padding:.45rem .8rem;font-size:.85rem;font-weight:600";
          bar.textContent = "📴 You are offline — reading cached content (may be out of date). Search, AI, account sync and payments are paused.";
          document.body.insertBefore(bar, document.body.firstChild);
        } else if(!off && bar){ bar.remove(); bar = null; }
      }
      window.addEventListener("online", paintNet);
      window.addEventListener("offline", paintNet);
      paintNet();
    }catch(_){}
    // Supabase connector: loads js/supabase-client.js relative to this file's location.
    // No-ops safely when no credentials are configured (stays in demo mode).
    try{
      var me = (document.currentScript && document.currentScript.src) || "";
      if (!me) { // currentScript is null inside DOMContentLoaded: find our own <script> tag instead
        var tags = document.getElementsByTagName("script");
        for (var ti = 0; ti < tags.length; ti++) {
          if (/(^|\/)app\.js(\?|#|$)/.test(tags[ti].src || "")) { me = tags[ti].src; break; }
        }
      }
      var rootBase = me ? me.slice(0, me.lastIndexOf("/") + 1) : "";
      var supa = document.createElement("script");
      supa.src = rootBase + "js/supabase-client.js";
      supa.defer = true;
      document.head.appendChild(supa);
      // i18n: dictionary first, engine second (English ⇄ Nigerian Pidgin, more later).
      var dictS = document.createElement("script");
      dictS.src = rootBase + "content/i18n.js";
      var engS = document.createElement("script");
      engS.src = rootBase + "js/i18n.js";
      dictS.onload = function(){ document.head.appendChild(engS); };
      dictS.onerror = function(e){ console.warn("[RA] dictionary script failed to load; staying English-only:", e); /* English-only; site keeps working */ };
      document.head.appendChild(dictS);
    }catch(_){}
    // mailto: launch guard. The real <a href="mailto:..."> always runs first and
    // is never preventDefault-ed. If the browser/OS drops the launch (no mail
    // app registered, protocol blocked), the page never loses focus — so after
    // a short wait we surface the address with a one-tap copy instead of
    // silently doing nothing. tel: links are unaffected.
    try{
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="mailto:"]'), function(a){
        a.addEventListener("click", function(){
          var launched = false;
          function mark(){ launched = true; }
          window.addEventListener("blur", mark);
          document.addEventListener("visibilitychange", mark);
          setTimeout(function(){
            window.removeEventListener("blur", mark);
            document.removeEventListener("visibilitychange", mark);
            if(!launched) showMailFallback(a.getAttribute("href").replace(/^mailto:/i, ""));
          }, 900);
        });
      });
      function showMailFallback(addr){
        if(!addr || document.getElementById("raMailFallback")) return;
        function remove(){ if(box && box.parentNode) box.parentNode.removeChild(box); }
        var box = document.createElement("div");
        box.className = "mail-fallback";
        box.id = "raMailFallback";
        box.setAttribute("role", "status");
        var msg = document.createElement("span");
        msg.className = "mail-fallback-msg";
        msg.textContent = "Your mail app didn\u2019t open? Email us directly:";
        var at = document.createElement("span");
        at.className = "mail-addr";
        at.textContent = addr;
        var copy = document.createElement("button");
        copy.type = "button";
        copy.className = "mail-copy";
        copy.textContent = "Copy address";
        copy.addEventListener("click", function(){
          function ok(){ copy.textContent = "Copied \u2713"; setTimeout(remove, 1400); }
          function manual(){
            try{
              var r = document.createRange(); r.selectNodeContents(at);
              var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
            }catch(_){}
            copy.textContent = "Press Ctrl+C";
          }
          if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(addr).then(ok, manual); }
          else { manual(); }
        });
        var close = document.createElement("button");
        close.type = "button";
        close.className = "mail-close";
        close.setAttribute("aria-label", "Dismiss email help");
        close.textContent = "\u00d7";
        close.addEventListener("click", remove);
        box.appendChild(msg); box.appendChild(at); box.appendChild(copy); box.appendChild(close);
        document.body.appendChild(box);
        setTimeout(remove, 15000);
      }
    }catch(_){}
    // Site-wide RightAware AI entry point (Stage 7): a floating "Ask AI" link
    // injected here so every page gets it without per-page markup edits. Skipped
    // on ai.html itself. Hidden by CSS in print and while the mobile "Right of
    // the Day" card (full-width on small screens) is open; z-index 90 sits above
    // that card (60) and below the email fallback panel (1000).
    try{
      var here = location.pathname || "";
      if(!/\/ai(\.html|\/)?$/.test(here) && !document.getElementById("raAiFab")){
        var home = (typeof rootBase === "string" && rootBase) ? rootBase : "";
        var fab = document.createElement("a");
        fab.id = "raAiFab";
        fab.className = "ra-ai-fab";
        fab.href = home ? home + "ai.html" : "/ai.html";
        fab.setAttribute("aria-label", "Ask RightAware AI \u2014 general legal information");
        var ico = document.createElement("span");
        ico.className = "ra-ai-fab-ico";
        ico.setAttribute("aria-hidden", "true");
        ico.textContent = "\u2728";
        var txt = document.createElement("span");
        txt.textContent = "Ask AI";
        fab.appendChild(ico);
        fab.appendChild(txt);
        document.body.appendChild(fab);
      }
    }catch(_){}
  });
})();
