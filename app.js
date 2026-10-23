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
    function esc(s){
      return String(s == null ? "" : s).replace(/[&<>"']/g, function(m){
        return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m];
      });
    }

    function getBasePath(){
      var link = document.querySelector('link[href*="styles.css"]');
      if(!link) return "";
      var href = link.getAttribute("href") || "";
      var idx = href.indexOf("styles.css");
      return idx > 0 ? href.substring(0, idx) : "";
    }

    function closeAllDropdowns(except){
      document.querySelectorAll(".nav-dropdown.open").forEach(function(d){
        if(d !== except){
          d.classList.remove("open");
          var b = d.querySelector(".nav-dropdown-btn");
          if(b) b.setAttribute("aria-expanded", "false");
        }
      });
    }

    document.addEventListener("click", function(e){
      if(!e.target.closest(".nav-dropdown")){
        closeAllDropdowns();
      }
    });

    function setupDropdown(wrap){
      var btn = wrap.querySelector(".nav-dropdown-btn");
      var menu = wrap.querySelector(".nav-dropdown-menu");
      if(!btn || !menu) return;

      var hoverTimer = null;
      var isForceClosed = false;

      function open(){
        closeAllDropdowns(wrap);
        wrap.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
      function close(){
        wrap.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
      function toggle(){
        isForceClosed = false;
        if(wrap.classList.contains("open")) close();
        else open();
      }

      btn.addEventListener("click", function(e){
        e.stopPropagation();
        toggle();
      });

      // Desktop Hover Handling with Pointer & Dismissal Synchronization (WCAG 2.1 SC 1.4.13)
      var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (min-width: 901px)").matches;
      if(canHover){
        wrap.addEventListener("mouseenter", function(){
          if(isForceClosed) return;
          clearTimeout(hoverTimer);
          open();
        });
        wrap.addEventListener("mouseleave", function(){
          isForceClosed = false;
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function(){
            close();
          }, 120);
        });
      }

      wrap.addEventListener("keydown", function(e){
        if(e.key === "Escape"){
          isForceClosed = true;
          clearTimeout(hoverTimer);
          close();
          btn.focus();
        } else if(e.key === "ArrowDown"){
          isForceClosed = false;
          if(!wrap.classList.contains("open")){
            open();
          }
          var first = menu.querySelector("a, button");
          if(first) first.focus();
        }
      });

      menu.querySelectorAll("a, button").forEach(function(item, idx, all){
        item.addEventListener("keydown", function(e){
          if(e.key === "ArrowDown"){
            e.preventDefault();
            var next = all[idx + 1] || all[0];
            if(next) next.focus();
          } else if(e.key === "ArrowUp"){
            e.preventDefault();
            var prev = all[idx - 1] || all[all.length - 1];
            if(prev) prev.focus();
          } else if(e.key === "Escape"){
            isForceClosed = true;
            clearTimeout(hoverTimer);
            close();
            btn.focus();
          }
        });
      });
    }

    // Progressive Desktop Navigation Hydration (Phase 3)
    function hydrateDesktopNav(){
      var nav = document.getElementById("mainNav") || document.querySelector("header .nav");
      if(!nav) return;
      var base = getBasePath();
      var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

      var rightsActive = page === "rights.html" || page === "laws.html" || page === "printables.html" || page === "videos.html" || page.indexOf("topic.html") !== -1 || page.indexOf("arrest-rights.html") !== -1;
      var actionActive = page === "help.html" || page === "lawyers.html" || page === "organizations.html" || page === "resources.html";

      nav.innerHTML = ''
        + '<div class="nav-dropdown' + (rightsActive ? ' active' : '') + '">'
        + '  <button type="button" class="nav-dropdown-btn" aria-expanded="false" aria-haspopup="true">'
        + '    Rights &amp; Laws'
        + '    <svg class="ra-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 1 5 5 9 1"></polyline></svg>'
        + '  </button>'
        + '  <div class="nav-dropdown-menu" role="menu">'
        + '    <a class="nav-dropdown-item' + (page === "rights.html" ? " active" : "") + '" href="' + base + "rights.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Rights Library</span>'
        + '      <span class="nav-dropdown-item-desc">Constitutional protections &amp; civic freedoms</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "arrest-rights.html" ? " active" : "") + '" href="' + base + "rights/arrest-rights.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Police &amp; Bail Guide</span>'
        + '      <span class="nav-dropdown-item-desc">Critical steps during stops, search &amp; arrest</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "laws.html" ? " active" : "") + '" href="' + base + "laws.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Laws of the Federation</span>'
        + '      <span class="nav-dropdown-item-desc">Searchable Nigerian legal acts &amp; statutes</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "printables.html" ? " active" : "") + '" href="' + base + "printables.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Printable Checklists</span>'
        + '      <span class="nav-dropdown-item-desc">Pocket emergency guides &amp; tenancy handbooks</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "videos.html" ? " active" : "") + '" href="' + base + "videos.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Civic Video Guides</span>'
        + '      <span class="nav-dropdown-item-desc">Visual legal walkthroughs in English &amp; Pidgin</span>'
        + '    </a>'
        + '  </div>'
        + '</div>'
        + '<div class="nav-dropdown' + (actionActive ? ' active' : '') + '">'
        + '  <button type="button" class="nav-dropdown-btn" aria-expanded="false" aria-haspopup="true">'
        + '    Citizen Action'
        + '    <svg class="ra-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 1 5 5 9 1"></polyline></svg>'
        + '  </button>'
        + '  <div class="nav-dropdown-menu" role="menu">'
        + '    <a class="nav-dropdown-item' + (page === "help.html" ? " active" : "") + '" href="' + base + "help.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Emergency Help Console</span>'
        + '      <span class="nav-dropdown-item-desc">Direct intervention, police CRU contacts &amp; hotlines</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item" href="' + base + "help.html#report" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Report a Violation</span>'
        + '      <span class="nav-dropdown-item-desc">Document and escalate police or human rights abuse</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "lawyers.html" ? " active" : "") + '" href="' + base + "lawyers.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Verified Legal Directory</span>'
        + '      <span class="nav-dropdown-item-desc">Connect with verified lawyers &amp; legal aid clinics</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "organizations.html" ? " active" : "") + '" href="' + base + "organizations.html" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Protection Agencies</span>'
        + '      <span class="nav-dropdown-item-desc">Public complaint commissions &amp; human rights desks</span>'
        + '    </a>'
        + '    <a class="nav-dropdown-item' + (page === "resources.html" ? " active" : "") + '" href="' + base + "resources.html#faqs" + '" role="menuitem">'
        + '      <span class="nav-dropdown-item-title">Citizen FAQs</span>'
        + '      <span class="nav-dropdown-item-desc">Common legal dilemmas answered in plain English</span>'
        + '    </a>'
        + '  </div>'
        + '</div>'
        + '<a href="' + base + 'ai.html"' + (page === "ai.html" ? ' class="active"' : '') + '>RightAware AI</a>'
        + '<a href="' + base + 'about.html"' + (page === "about.html" ? ' class="active"' : '') + '>About Us</a>';

      nav.querySelectorAll(".nav-dropdown").forEach(setupDropdown);
    }
    hydrateDesktopNav();

    // Live Header Auth Synchronization (Phase 4)
    function syncHeaderAuth(){
      var actions = document.querySelector(".header-actions");
      if(!actions) return;
      var base = getBasePath();

      var cur = (window.RA_AUTH && typeof window.RA_AUTH.current === "function") ? window.RA_AUTH.current() : null;
      var isAuthed = !!(cur && !cur.demo && (cur.supabaseId || cur.email));

      function applyAuthUI(user){
        var existingMenu = actions.querySelector(".ra-user-menu");
        var existingLogin = actions.querySelector(".ra-auth-btn") || actions.querySelector('a[href*="login.html"]') || actions.querySelector('a[href*="signup.html"]');
        var rawLogout = actions.querySelector("#logoutBtn");
        var rawChip = actions.querySelector("#whoChip");

        if(user){
          if(existingLogin) existingLogin.remove();
          if(rawLogout) rawLogout.style.display = "none";
          if(rawChip) rawChip.style.display = "none";

          var meta = user.user_metadata || {};
          var name = meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "Account");
          if(name.length > 14) name = name.substring(0, 12) + "…";

          if(!existingMenu){
            var wrap = document.createElement("div");
            wrap.className = "nav-dropdown ra-user-menu";
            wrap.innerHTML = '<button type="button" class="btn btn-outline btn-sm nav-dropdown-btn ra-user-btn" aria-expanded="false" aria-haspopup="true">'
              + '<svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
              + '<span class="ra-user-name">' + esc(name) + '</span>'
              + '<svg class="ra-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 1 5 5 9 1"></polyline></svg>'
              + '</button>'
              + '<div class="nav-dropdown-menu" role="menu">'
              + '<a class="nav-dropdown-item" href="' + base + 'account.html" role="menuitem"><span class="nav-dropdown-item-title">My Account</span><span class="nav-dropdown-item-desc">Civic profile &amp; settings</span></a>'
              + '<a class="nav-dropdown-item" href="' + base + 'account.html#saved" role="menuitem"><span class="nav-dropdown-item-title">Saved Guides</span><span class="nav-dropdown-item-desc">Your pinned rights &amp; laws</span></a>'
              + '<div class="nav-dropdown-divider"></div>'
              + '<button type="button" class="ra-logout-link" role="menuitem">'
              + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
              + 'Log Out</button>'
              + '</div>';

            var urgentBtn = actions.querySelector(".btn-urgent");
            if(urgentBtn) actions.insertBefore(wrap, urgentBtn);
            else actions.insertBefore(wrap, actions.firstChild);

            var logoutBtn = wrap.querySelector(".ra-logout-link");
            if(logoutBtn){
              logoutBtn.addEventListener("click", function(){
                if(window.RA_AUTH && typeof window.RA_AUTH.logoutLive === "function"){
                  window.RA_AUTH.logoutLive().then(function(){
                    location.reload();
                  }).catch(function(){
                    location.reload();
                  });
                } else {
                  location.href = base + "login.html";
                }
              });
            }
            setupDropdown(wrap);
          } else {
            var nameSpan = existingMenu.querySelector(".ra-user-name");
            if(nameSpan) nameSpan.textContent = name;
          }
        } else {
          if(existingMenu) existingMenu.remove();
          if(rawLogout) rawLogout.style.display = "";
          if(rawChip) rawChip.style.display = "";

          var isLoginPage = (location.pathname.split("/").pop() || "").toLowerCase() === "login.html";
          if(!existingLogin && !rawLogout){
            var loginA = document.createElement("a");
            loginA.className = "btn btn-outline btn-sm ra-auth-btn";
            loginA.href = base + (isLoginPage ? "signup.html" : "login.html");
            loginA.textContent = isLoginPage ? "Sign Up" : "Log In";
            var urgentBtn = actions.querySelector(".btn-urgent");
            if(urgentBtn) actions.insertBefore(loginA, urgentBtn);
            else actions.insertBefore(loginA, actions.firstChild);
          }
        }
      }

      if(isAuthed){
        applyAuthUI(cur);
      } else if(window.RA_SUPA && RA_SUPA.ready && RA_SUPA.client && RA_SUPA.client.auth){
        RA_SUPA.client.auth.getSession().then(function(r){
          var s = r && r.data && r.data.session;
          if(s && s.user){
            applyAuthUI(s.user);
          } else {
            applyAuthUI(null);
          }
        }).catch(function(){
          applyAuthUI(null);
        });
      } else {
        var directLogin = actions.querySelector('a[href*="login.html"]');
        if(directLogin && !directLogin.classList.contains("ra-auth-btn")){
          directLogin.classList.add("ra-auth-btn");
        }
      }
    }

    syncHeaderAuth();
    document.addEventListener("ra:session-ready", syncHeaderAuth);
    document.addEventListener("ra:backend-ready", syncHeaderAuth);
    window.addEventListener("storage", function(e){
      if(e.key === "ra_auth" || e.key === "ra_env" || (e.key && e.key.indexOf("sb-") === 0)){
        syncHeaderAuth();
      }
    });

    // Mobile nav active links
    var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".mobile-nav a").forEach(function(a){
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
          bar.textContent = "You are offline — reading cached content (may be out of date). Search, AI, account sync and payments are paused.";
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
        ico.innerHTML = '<svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>';
        var txt = document.createElement("span");
        txt.textContent = "Ask AI";
        fab.appendChild(ico);
        fab.appendChild(txt);
        document.body.appendChild(fab);
      }
    }catch(_){}
  });
})();
