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
  });
})();
