/* RightAware shared app JS: nav, search redirect, newsletter, footer year. */
(function(){
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function(){
    // Mobile nav overlay controller
    var btn = document.getElementById("menuBtn"), nav = document.getElementById("mobileNav");
    // Teleport out of .site-header so backdrop-filter does not trap overlay inside header
    if(nav && nav.parentNode && nav.parentNode !== document.body){
      document.body.appendChild(nav);
    }
    function closeOverlayNav(){
      if(nav) nav.classList.remove("open");
      if(btn) {
        btn.classList.remove("is-active");
        btn.setAttribute("aria-expanded", "false");
      }
      document.body.classList.remove("nav-open");
    }
    function openOverlayNav(){
      if(nav) nav.classList.add("open");
      if(btn) {
        btn.classList.add("is-active");
        btn.setAttribute("aria-expanded", "true");
      }
      document.body.classList.add("nav-open");
    }
    if(btn && nav){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        if(nav.classList.contains("open")) {
          closeOverlayNav();
        } else {
          openOverlayNav();
        }
      });
      nav.querySelectorAll("a").forEach(function(a){
        a.addEventListener("click", closeOverlayNav);
      });
    }
    window.raCloseNav = closeOverlayNav;
    window.raOpenNav = openOverlayNav;
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

    // Progressive Desktop & Mobile Navigation Hydration (Phase 3)
    // Enforces order: Home, About, Explore Rights, Resources, Contact Us, Get Help + Hover Dropdown (More)
    function hydrateDesktopNav(){
      var nav = document.getElementById("mainNav") || document.querySelector("header .nav");
      if(!nav) return;
      var base = getBasePath();
      var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

      var homeActive = page === "index.html" || page === "";
      var aboutActive = page === "about.html";
      var rightsActive = page === "rights.html" || page.indexOf("topic.html") !== -1;
      var resourcesActive = page === "resources.html";
      var contactActive = page === "contact.html";
      var helpActive = page === "help.html";
      var moreActive = page === "laws.html" || page === "organizations.html" || page === "organization.html" || page === "lawyers.html" || page === "ai.html" || page === "printables.html" || page === "videos.html" || page.indexOf("arrest-rights.html") !== -1;

      nav.innerHTML = ''
        + '<a href="' + base + 'index.html"' + (homeActive ? ' class="active"' : '') + '>Home</a>'
        + '<a href="' + base + 'about.html"' + (aboutActive ? ' class="active"' : '') + '>About Us</a>'
        + '<a href="' + base + 'rights.html"' + (rightsActive ? ' class="active"' : '') + '>Explore Rights</a>'
        + '<a href="' + base + 'resources.html"' + (resourcesActive ? ' class="active"' : '') + '>Resources</a>'
        + '<a href="' + base + 'contact.html"' + (contactActive ? ' class="active"' : '') + '>Contact Us</a>'
        + '<a href="' + base + 'help.html"' + (helpActive ? ' class="active"' : '') + '>Get Help</a>'
        + '<div class="nav-dropdown' + (moreActive ? ' active' : '') + '">'
        + '  <button type="button" class="nav-dropdown-btn" aria-expanded="false" aria-haspopup="true">'
        + '    More'
        + '    <svg class="ra-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 1 5 5 9 1"></polyline></svg>'
        + '  </button>'
        + '  <div class="nav-dropdown-menu nav-dropdown-mega" role="menu">'
        + '    <div class="nav-mega-grid">'
        + '      <div class="nav-mega-col">'
        + '        <div class="nav-mega-heading">'
        + '          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
        + '          Civic &amp; Legal Libraries'
        + '        </div>'
        + '        <a class="nav-dropdown-item' + (page === "laws.html" ? " active" : "") + '" href="' + base + 'laws.html" role="menuitem">'
        + '          <span class="nav-mega-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></span>'
        + '          <span class="nav-mega-content">'
        + '            <span class="nav-mega-title">Laws Library <span class="nav-mega-badge">21 Acts</span></span>'
        + '            <span class="nav-mega-desc">Searchable Nigerian legal acts &amp; statutes</span>'
        + '          </span>'
        + '        </a>'
        + '        <a class="nav-dropdown-item' + (page === "organizations.html" || page === "organization.html" ? " active" : "") + '" href="' + base + 'organizations.html" role="menuitem">'
        + '          <span class="nav-mega-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span>'
        + '          <span class="nav-mega-content">'
        + '            <span class="nav-mega-title">Organizations</span>'
        + '            <span class="nav-mega-desc">Public complaint commissions &amp; 36 desks</span>'
        + '          </span>'
        + '        </a>'
        + '        <a class="nav-dropdown-item' + (page === "lawyers.html" ? " active" : "") + '" href="' + base + 'lawyers.html" role="menuitem">'
        + '          <span class="nav-mega-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>'
        + '          <span class="nav-mega-content">'
        + '            <span class="nav-mega-title">Legal Directory</span>'
        + '            <span class="nav-mega-desc">Verified lawyers &amp; legal aid clinics</span>'
        + '          </span>'
        + '        </a>'
        + '      </div>'
        + '      <div class="nav-mega-col">'
        + '        <div class="nav-mega-heading">'
        + '          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
        + '          Emergency &amp; AI Tools'
        + '        </div>'
        + '        <a class="nav-dropdown-item' + (page === "ai.html" ? " active" : "") + '" href="' + base + 'ai.html" role="menuitem">'
        + '          <span class="nav-mega-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></span>'
        + '          <span class="nav-mega-content">'
        + '            <span class="nav-mega-title">RightAware AI <span class="nav-mega-badge">Instant</span></span>'
        + '            <span class="nav-mega-desc">Interactive Nigerian civic &amp; legal assistant</span>'
        + '          </span>'
        + '        </a>'
        + '        <a class="nav-dropdown-item' + (page.indexOf("arrest-rights.html") !== -1 ? " active" : "") + '" href="' + base + 'rights/arrest-rights.html" role="menuitem">'
        + '          <span class="nav-mega-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>'
        + '          <span class="nav-mega-content">'
        + '            <span class="nav-mega-title">Police &amp; Bail <span class="nav-mega-badge nav-mega-badge-urgent">Shield</span></span>'
        + '            <span class="nav-mega-desc">Critical safeguards during stops &amp; arrest</span>'
        + '          </span>'
        + '        </a>'
        + '        <a class="nav-dropdown-item' + (page === "printables.html" ? " active" : "") + '" href="' + base + 'printables.html" role="menuitem">'
        + '          <span class="nav-mega-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></span>'
        + '          <span class="nav-mega-content">'
        + '            <span class="nav-mega-title">Print Checklists</span>'
        + '            <span class="nav-mega-desc">Pocket emergency guides &amp; handbooks</span>'
        + '          </span>'
        + '        </a>'
        + '      </div>'
        + '    </div>'
        + '    <div class="nav-mega-footer">'
        + '      <a class="nav-mega-foot-link" href="' + base + 'videos.html">'
        + '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
        + '        Civic Video Guides'
        + '      </a>'
        + '      <a class="nav-mega-foot-link" href="' + base + 'contact.html">'
        + '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>'
        + '        Contact Civic Desk &rarr;'
        + '      </a>'
        + '    </div>'
        + '  </div>'
        + '</div>';

      nav.querySelectorAll(".nav-dropdown").forEach(setupDropdown);
    }

    function hydrateMobileNav(){
      var mNav = document.getElementById("mobileNav");
      if(!mNav) return;
      if(mNav.parentNode && mNav.parentNode !== document.body){
        document.body.appendChild(mNav);
      }
      var base = getBasePath();
      var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

      var cur = (window.RA_AUTH && typeof window.RA_AUTH.current === "function") ? window.RA_AUTH.current() : null;
      var isAuthed = !!(cur && !cur.demo && (cur.supabaseId || cur.email));

      var authLink = isAuthed
        ? '<a href="' + base + 'account.html">My Account &amp; Workspace</a>'
        : '<a href="' + base + 'login.html">Log In / Register</a>';

      mNav.innerHTML = ''
        + '<div class="mobile-nav-top">'
        + '  <a href="' + base + 'index.html" class="logo" aria-label="RightAware Home">'
        + '    <span class="logo-brand"><img src="' + base + 'assets/images/logo-rightaware.webp" alt="RightAware" width="130" height="30" loading="lazy" decoding="async"/></span>'
        + '  </a>'
        + '  <button type="button" class="mobile-nav-close" id="mobileNavClose" aria-label="Close menu">✕</button>'
        + '</div>'
        + '<div class="mobile-nav-body">'
        + '  <form data-global-search class="msearch" role="search" style="margin-bottom:0.75rem;"><input type="search" placeholder="Search rights, laws, topics…" aria-label="Search"/></form>'
        + '  <div class="mobile-nav-section-title">Core Civic Library</div>'
        + '  <a href="' + base + 'index.html"' + (page === "index.html" || page === "" ? ' class="active"' : '') + '>Home</a>'
        + '  <a href="' + base + 'rights.html"' + (page === "rights.html" || page.indexOf("topic.html") !== -1 ? ' class="active"' : '') + '>Explore Rights (28 Guides)</a>'
        + '  <a href="' + base + 'laws.html"' + (page === "laws.html" ? ' class="active"' : '') + '>Laws Library (Acts &amp; Codes)</a>'
        + '  <a href="' + base + 'organizations.html"' + (page === "organizations.html" || page === "organization.html" ? ' class="active"' : '') + '>Organizations &amp; 36 Hotlines</a>'
        + '  <a href="' + base + 'lawyers.html"' + (page === "lawyers.html" ? ' class="active"' : '') + '>Legal Directory (Lawyers)</a>'
        + '  <a href="' + base + 'resources.html"' + (page === "resources.html" ? ' class="active"' : '') + '>Resources &amp; Toolkits</a>'
        + '  <div class="mobile-nav-section-title">Emergency &amp; AI Tools</div>'
        + '  <a href="' + base + 'ai.html"' + (page === "ai.html" ? ' class="active"' : '') + '>RightAware AI Assistant</a>'
        + '  <a href="' + base + 'help.html"' + (page === "help.html" ? ' class="active"' : '') + ' style="color:#dc2626; font-weight:700;">Emergency Help &amp; Report</a>'
        + '  <a href="' + base + 'printables.html"' + (page === "printables.html" ? ' class="active"' : '') + '>Printable Pocket Checklists</a>'
        + '  <a href="' + base + 'videos.html"' + (page === "videos.html" ? ' class="active"' : '') + '>Civic Video Guides</a>'
        + '  <div class="mobile-nav-section-title">About &amp; Civic Desk</div>'
        + '  <a href="' + base + 'about.html"' + (page === "about.html" ? ' class="active"' : '') + '>About RightAware Mission</a>'
        + '  <a href="' + base + 'contact.html"' + (page === "contact.html" ? ' class="active"' : '') + '>Contact Civic Desk</a>'
        + '  <div class="mobile-nav-section-title">Account &amp; Workspace</div>'
        + authLink
        + '</div>';

      function closeNav(){
        mNav.classList.remove("open");
        var btn = document.getElementById("menuBtn");
        if(btn) {
          btn.classList.remove("is-active");
          btn.setAttribute("aria-expanded", "false");
        }
        document.body.classList.remove("nav-open");
      }

      var closeBtn = document.getElementById("mobileNavClose");
      if(closeBtn) closeBtn.addEventListener("click", closeNav);

      mNav.querySelectorAll("a").forEach(function(a){
        a.addEventListener("click", closeNav);
      });

      document.addEventListener("keydown", function(e){
        if(e.key === "Escape" && mNav.classList.contains("open")){
          closeNav();
        }
      });
    }

    function ensureHeaderSearch(){
      var actions = document.querySelector(".header-actions");
      if(!actions || actions.querySelector(".hsearch")) return;
      var base = getBasePath();
      var form = document.createElement("form");
      form.className = "hsearch";
      form.setAttribute("data-global-search", "");
      form.setAttribute("role", "search");
      form.setAttribute("aria-label", "Search Nigerian rights and laws");
      form.setAttribute("data-base", base);
      form.innerHTML = '<span class="hsearch-icon" aria-hidden="true">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
        + '</span>'
        + '<input type="search" placeholder="Search rights, laws…" aria-label="Search rights, laws"/>';

      form.addEventListener("submit", function(e){
        e.preventDefault();
        var inp = form.querySelector("input[type=search]");
        var q = (inp ? inp.value : "").trim();
        if(q) location.href = base + "search.html?q=" + encodeURIComponent(q);
      });

      actions.insertBefore(form, actions.firstChild);
    }

    ensureHeaderSearch();
    hydrateDesktopNav();
    hydrateMobileNav();

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
          var role = ((cur && cur.role) || (user && user.role) || "user").toLowerCase();
          var workspaceItem = "";
          if (role === "professional") {
            workspaceItem = '<a class="nav-dropdown-item" href="' + base + 'professional.html" role="menuitem"><span class="nav-dropdown-item-title">⚖️ Professional Workspace</span><span class="nav-dropdown-item-desc">Consultation intake &amp; profile</span></a>';
          } else if (role === "organization") {
            workspaceItem = '<a class="nav-dropdown-item" href="' + base + 'organization.html" role="menuitem"><span class="nav-dropdown-item-title">🏢 Organization Desk</span><span class="nav-dropdown-item-desc">Hotlines &amp; incident dispatch</span></a>';
          } else if (role === "admin") {
            workspaceItem = '<a class="nav-dropdown-item" href="' + base + 'admin.html" role="menuitem"><span class="nav-dropdown-item-title">🛡️ Admin Moderation</span><span class="nav-dropdown-item-desc">Review applications &amp; records</span></a>';
          }
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
              + '<div class="nav-dropdown-menu" role="menu">' + workspaceItem
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

    /* ==========================================================================
       MOBILE 5-TAB BOTTOM NAVIGATION & CROSS-PAGE SUBNAV
       ========================================================================== */

    var ROUTE_GROUPS = {
      home: ['index.html', ''],
      rights: ['rights.html', 'topic.html', 'laws.html', 'arrest-rights.html', 'resources.html', 'printables.html', 'videos.html'],
      help: ['help.html', 'organizations.html', 'organization.html', 'lawyers.html'],
      ai: ['ai.html'],
      account: ['account.html', 'professional.html', 'admin.html', 'login.html', 'signup.html']
    };

    function getActiveNavGroup() {
      var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      for (var group in ROUTE_GROUPS) {
        if (ROUTE_GROUPS[group].indexOf(path) !== -1) return group;
      }
      return 'home';
    }

    function resolveTab5Config() {
      var base = getBasePath();
      var cur = (window.RA_AUTH && typeof window.RA_AUTH.current === "function") ? window.RA_AUTH.current() : null;
      var isAuthed = !!(cur && !cur.demo && (cur.supabaseId || cur.email));

      if (!isAuthed) {
        return {
          href: base + "login.html",
          label: "Log In",
          badge: false,
          iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
        };
      }

      var role = (cur.role || "user").toLowerCase();
      if (role === "professional") {
        return {
          href: base + "professional.html",
          label: "Workspace",
          badge: true,
          iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>'
        };
      } else if (role === "organization") {
        return {
          href: base + "organization.html",
          label: "Desk",
          badge: true,
          iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'
        };
      } else if (role === "admin") {
        return {
          href: base + "admin.html",
          label: "Admin",
          badge: true,
          iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
        };
      }

      return {
        href: base + "account.html",
        label: "Account",
        badge: false,
        iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
      };
    }

    function updateBottomNavAuth() {
      var tab = document.getElementById("raTabAccount");
      if (!tab) return;
      var tab5 = resolveTab5Config();
      tab.href = tab5.href;
      var icon = tab.querySelector(".ra-tab-account-icon");
      if (icon) icon.innerHTML = tab5.iconSvg;
      var lbl = tab.querySelector(".ra-tab-account-label");
      if (lbl) lbl.textContent = tab5.label;
      if (tab5.badge) tab.classList.add("has-badge");
      else tab.classList.remove("has-badge");
    }

    function renderBottomNav() {
      if (document.getElementById("raBottomNav")) return;
      var base = getBasePath();
      var group = getActiveNavGroup();
      var tab5 = resolveTab5Config();

      var nav = document.createElement("nav");
      nav.id = "raBottomNav";
      nav.className = "ra-bottom-nav";
      nav.setAttribute("aria-label", "Mobile primary navigation");

      nav.innerHTML = ''
        + '<a href="' + base + 'index.html" class="ra-bottom-tab' + (group === 'home' ? ' active' : '') + '" id="raTabHome"' + (group === 'home' ? ' aria-current="page"' : '') + '>'
        + '  <span class="ra-tab-icon">'
        + '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
        + '  </span>'
        + '  <span class="ra-tab-label">Home</span>'
        + '</a>'
        + '<a href="' + base + 'rights.html" class="ra-bottom-tab' + (group === 'rights' ? ' active' : '') + '" id="raTabRights"' + (group === 'rights' ? ' aria-current="page"' : '') + '>'
        + '  <span class="ra-tab-icon">'
        + '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
        + '  </span>'
        + '  <span class="ra-tab-label">Rights</span>'
        + '</a>'
        + '<button type="button" class="ra-bottom-tab ra-tab-ai' + (group === 'ai' ? ' active' : '') + '" id="raTabAi" aria-label="Ask RightAware Legal AI">'
        + '  <span class="ra-tab-ai-circle">'
        + '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>'
        + '  </span>'
        + '  <span class="ra-tab-label">Ask AI</span>'
        + '</button>'
        + '<a href="' + base + 'help.html" class="ra-bottom-tab' + (group === 'help' ? ' active' : '') + '" id="raTabHelp"' + (group === 'help' ? ' aria-current="page"' : '') + '>'
        + '  <span class="ra-tab-icon">'
        + '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        + '  </span>'
        + '  <span class="ra-tab-label">Get Help</span>'
        + '</a>'
        + '<a href="' + tab5.href + '" class="ra-bottom-tab' + (group === 'account' ? ' active' : '') + (tab5.badge ? ' has-badge' : '') + '" id="raTabAccount"' + (group === 'account' ? ' aria-current="page"' : '') + '>'
        + '  <span class="ra-tab-icon ra-tab-account-icon">' + tab5.iconSvg + '</span>'
        + '  <span class="ra-tab-label ra-tab-account-label">' + esc(tab5.label) + '</span>'
        + '</a>';

      document.body.appendChild(nav);

      nav.querySelectorAll(".ra-bottom-tab").forEach(function(tabLink) {
        tabLink.addEventListener("click", function() {
          if (typeof window.raCloseNav === "function") {
            window.raCloseNav();
          }
        });
      });

      var aiBtn = nav.querySelector("#raTabAi");
      if (aiBtn) {
        aiBtn.addEventListener("click", function(e) {
          e.preventDefault();
          var drawer = document.getElementById("raAiDrawer");
          if (drawer && typeof window.raOpenAiDrawer === "function") {
            window.raOpenAiDrawer();
          } else if (drawer) {
            drawer.classList.add("open");
            drawer.setAttribute("aria-hidden", "false");
            var inp = drawer.querySelector("input, textarea");
            if (inp) setTimeout(function() { inp.focus(); }, 150);
          } else {
            location.href = base + "ai.html";
          }
        });
      }
    }

    function renderStickySubNav() {
      var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      var base = getBasePath();
      var mainEl = document.getElementById("main") || document.querySelector("main");
      if (!mainEl || document.querySelector(".ra-subnav-pills")) return;

      var subnavHtml = "";
      if (path === "rights.html" || path === "laws.html" || path.indexOf("topic.html") !== -1 || path.indexOf("arrest-rights.html") !== -1) {
        subnavHtml = ''
          + '<nav class="ra-subnav-pills" aria-label="Rights & Laws Navigation">'
          + '  <div class="container ra-subnav-inner">'
          + '    <a href="' + base + 'rights.html" class="ra-subnav-pill' + (path === "rights.html" || path.indexOf("topic.html") !== -1 ? ' active' : '') + '"' + (path === "rights.html" ? ' aria-current="page"' : '') + '>'
          + '      <svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
          + '      28 Rights Topics'
          + '    </a>'
          + '    <a href="' + base + 'laws.html" class="ra-subnav-pill' + (path === "laws.html" ? ' active' : '') + '"' + (path === "laws.html" ? ' aria-current="page"' : '') + '>'
          + '      <svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
          + '      Searchable Laws (21)'
          + '    </a>'
          + '    <a href="' + base + 'printables.html" class="ra-subnav-pill' + (path === "printables.html" ? ' active' : '') + '">'
          + '      Checklists'
          + '    </a>'
          + '  </div>'
          + '</nav>';
      } else if (path === "help.html" || path === "organizations.html" || path === "organization.html" || path === "lawyers.html") {
        subnavHtml = ''
          + '<nav class="ra-subnav-pills" aria-label="Citizen Support Navigation">'
          + '  <div class="container ra-subnav-inner">'
          + '    <a href="' + base + 'help.html" class="ra-subnav-pill' + (path === "help.html" ? ' active' : '') + '"' + (path === "help.html" ? ' aria-current="page"' : '') + '>'
          + '      <svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
          + '      Emergency & Report'
          + '    </a>'
          + '    <a href="' + base + 'organizations.html" class="ra-subnav-pill' + (path === "organizations.html" || path === "organization.html" ? ' active' : '') + '"' + (path === "organizations.html" ? ' aria-current="page"' : '') + '>'
          + '      <svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'
          + '      36 Statutory Desks'
          + '    </a>'
          + '    <a href="' + base + 'lawyers.html" class="ra-subnav-pill' + (path === "lawyers.html" ? ' active' : '') + '"' + (path === "lawyers.html" ? ' aria-current="page"' : '') + '>'
          + '      <svg class="ra-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
          + '      Legal Professionals'
          + '    </a>'
          + '  </div>'
          + '</nav>';
      }

      if (subnavHtml) {
        var wrapDiv = document.createElement("div");
        wrapDiv.innerHTML = subnavHtml;
        mainEl.insertBefore(wrapDiv.firstElementChild, mainEl.firstChild);
      }
    }

    function bindKeyboardDefense() {
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", function() {
          var isKeyboard = window.visualViewport.height < (window.innerHeight * 0.78);
          document.body.classList.toggle("keyboard-open", isKeyboard);
        });
      }
      document.addEventListener("focusin", function(e) {
        if (e.target && e.target.matches("input, textarea, select")) {
          document.body.classList.add("keyboard-open");
        }
      });
      document.addEventListener("focusout", function(e) {
        if (e.target && e.target.matches("input, textarea, select")) {
          setTimeout(function() {
            if (!document.activeElement || !document.activeElement.matches("input, textarea, select")) {
              document.body.classList.remove("keyboard-open");
            }
          }, 60);
        }
      });
    }

    function checkEmergencyDeepLink() {
      var hash = (window.location.hash || "").toLowerCase();
      if (hash === "#emergencyconsole" || hash === "#urgent-help" || hash === "#emergency" || hash === "#triage") {
        if (typeof window.raOpenEmergencyModal === "function") {
          window.raOpenEmergencyModal();
        }
      }
    }

    // Initialize Mobile Architecture & Lifecycle Listeners
    renderStickySubNav();
    renderBottomNav();
    updateBottomNavAuth();
    bindKeyboardDefense();
    checkEmergencyDeepLink();

    window.addEventListener("hashchange", checkEmergencyDeepLink);
    document.addEventListener("ra:auth-change", updateBottomNavAuth);
    document.addEventListener("ra:session-ready", updateBottomNavAuth);
    document.addEventListener("ra:backend-ready", updateBottomNavAuth);
    document.addEventListener("ra:synced", updateBottomNavAuth);
  });
})();
