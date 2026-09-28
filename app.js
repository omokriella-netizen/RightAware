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
    // Reveal on scroll (light, fast)
    if("IntersectionObserver" in window){
      var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } }); }, {threshold:.08});
      document.querySelectorAll(".rv").forEach(function(el){ el.classList.add("rvh"); io.observe(el); });
    }
    // Service worker: offline-first core content (http(s) hosts only; skipped on file://)
    if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register("/sw.js").catch(function(){});
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
      dictS.onerror = function(){ /* English-only; site keeps working */ };
      document.head.appendChild(dictS);
    }catch(_){}
  });
})();
