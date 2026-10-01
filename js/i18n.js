/* RightAware i18n engine — English ⇄ Nigerian Pidgin (structure ready for more languages).
   Text-match approach: no HTML edits required. The engine walks text nodes and
   input placeholders, matches them against the exact English source strings in
   content/i18n.js, and swaps in the selected language. Originals are remembered so
   switching back always restores English. A MutationObserver re-applies after
   dynamic content (cards, results) renders. UI only — legal/source wording is never
   translated by this engine (dictionary authors must keep statutory text in `en`). */
(function(){
  "use strict";
  var STORE_KEY = "ra_lang";
  var lang = "en";
  var dict = null, bySource = null, applying = false, pending = null;

  function normalize(s){
    return String(s == null ? "" : s)
      .replace(/\u00AD/g, "")        // soft hyphen
      .replace(/\s+/g, " ")
      .trim();
  }
  function currentLang(){
    try{
      var saved = localStorage.getItem(STORE_KEY);
      if(saved && (window.RA_I18N.meta.languages||[]).some(function(l){ return l.id === saved; })) return saved;
    }catch(_){}
    return (window.RA_I18N && RA_I18N.meta.defaultLang) || "en";
  }
  function buildIndex(){
    dict = (window.RA_I18N && RA_I18N.strings) || {};
    bySource = {};
    Object.keys(dict).forEach(function(id){
      var e = dict[id];
      if(e && e.en) bySource[normalize(e.en)] = id;
    });
  }
  function t(id){
    var e = dict && dict[id];
    if(!e) return null;
    var v = e[lang];
    if(v == null || v === "") v = e.en;
    return v;
  }
  function translateTextNode(node){
    if(!node.__raEn) node.__raEn = node.nodeValue;
    var src = normalize(node.__raEn);
    if(!src) return;
    var id = bySource[src];
    if(!id){ return; }
    var next = t(id);
    if(next && node.nodeValue !== next) node.nodeValue = next;
    else if(lang === "en" && node.nodeValue !== node.__raEn) node.nodeValue = node.__raEn;
  }
  function translatePlaceholder(el){
    if(el.__raPh == null) el.__raPh = el.getAttribute("placeholder") || "";
    if(!el.__raPh) return;
    var id = bySource[normalize(el.__raPh)];
    if(!id) return;
    var next = t(id) || el.__raPh;
    if(el.placeholder !== next) el.placeholder = next;
  }
  var WALK_TAGS = { A:1, BUTTON:1, SPAN:1, H1:1, H2:1, H3:1, H4:1, H5:1, H6:1, P:1, LI:1, LABEL:1, SMALL:1, STRONG:1, TD:1, TH:1, OPTION:1, LEGEND:1, SUMMARY:1, FIGCAPTION:1, DT:1, DD:1, DIV:1, BLOCKQUOTE:1, CAPTION:1 };

  function walk(node){
    if(node.nodeType === 3){ translateTextNode(node); return; }
    if(node.nodeType !== 1) return;
    if(node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "NOSCRIPT") return;
    if(node.classList && node.classList.contains("ra-lang")) return;
    if(node.tagName === "INPUT" && (node.type === "search" || node.type === "text" || node.type === "email" || node.type === "password")) translatePlaceholder(node);
    if(node.tagName === "TEXTAREA") translatePlaceholder(node);
    var kids = node.childNodes;
    for(var i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function apply(){
    if(!window.RA_I18N) return;
    if(!dict) buildIndex();
    applying = true;
    try{
      walk(document.body);
      try{ document.documentElement.setAttribute("lang", lang === "pcm" ? "pcm" : "en"); }catch(_){}
    }finally{ applying = false; }
  }

  /* ---------- language selector UI ---------- */
  function mountSelector(){
    var mount = document.querySelector(".header-actions") || document.querySelector(".mobile-nav") || document.querySelector("header .container");
    if(!mount || document.querySelector(".ra-lang")) return;
    var wrap = document.createElement("span");
    wrap.className = "ra-lang";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:.3rem";
    var sel = document.createElement("select");
    sel.className = "ra-lang-select";
    sel.setAttribute("aria-label", "Language / Language selection");
    sel.style.cssText = "border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:inherit;border-radius:999px;padding:.4rem .6rem;font-size:.82rem;font-weight:600;cursor:pointer";
    (window.RA_I18N.meta.languages||[]).forEach(function(l){
      var o = document.createElement("option");
      o.value = l.id; o.textContent = "🌐 " + (l.nativeLabel || l.label);
      sel.appendChild(o);
    });
    sel.value = lang;
    sel.addEventListener("change", function(){
      lang = sel.value;
      try{ localStorage.setItem(STORE_KEY, lang); }catch(_){}
      apply();
      try{ document.dispatchEvent(new CustomEvent("ra:langchange", { detail:{ lang:lang } })); }catch(_){}
    });
    wrap.appendChild(sel);
    /* keep the desktop hamburger last */
    var burger = mount.querySelector(".hamburger");
    if(burger) mount.insertBefore(wrap, burger); else mount.appendChild(wrap);
  }

  /* ---------- account language preference ---------- */
  /* profiles.language (synced to this device by js/db.js) is adopted when the
     visitor has NEVER picked a language with the header selector here —
     ra_lang absent means "no device choice yet", so the account copy is the
     truth. Choosing in the selector writes ra_lang and this device keeps its
     own choice from then on. */
  function adoptProfileLanguage(){
    try{
      if(localStorage.getItem(STORE_KEY)) return;
      var pl = null;
      try{ var p = JSON.parse(localStorage.getItem("ra_profile") || "null"); if(p) pl = p.language; }catch(_){ pl = null; }
      var want = pl === "Pidgin" ? "pcm" : (pl === "English" ? "en" : null);
      if(!want || want === lang) return;
      lang = want;
      apply();
      var sel = document.querySelector(".ra-lang-select"); if(sel) sel.value = lang;
    }catch(_){}
  }
  try{ document.addEventListener("ra:synced", adoptProfileLanguage); }catch(_){}

  /* ---------- boot ---------- */
  function boot(){
    if(!window.RA_I18N){ return; }
    lang = currentLang();
    buildIndex();
    mountSelector();
    apply();
    if("MutationObserver" in window){
      var obs = new MutationObserver(function(muts){
        if(applying) return;
        var useful = muts.some(function(m){
          if(m.type === "characterData") return !m.target.__raEn || normalize(m.target.nodeValue) !== normalize(m.target.__raEn);
          return m.addedNodes && m.addedNodes.length > 0;
        });
        if(!useful) return;
        if(pending) clearTimeout(pending);
        pending = setTimeout(apply, 120);
      });
      obs.observe(document.body, { subtree:true, childList:true, characterData:true });
    }
  }

  window.RA_I18N_API = {
    t: function(id){ if(!dict) buildIndex(); return t(id); },
    apply: apply,
    get lang(){ return lang; },
    setLang: function(next){
      lang = next;
      try{ localStorage.setItem(STORE_KEY, lang); }catch(_){}
      apply();
      var sel = document.querySelector(".ra-lang-select"); if(sel) sel.value = lang;
    },
    reviewStatus: function(id){
      var e = dict && dict[id]; if(!e) return null;
      var st = (window.RA_I18N.status || {})[lang] || {};
      return { lang: lang, state: st.state || "draft", note: st.note || "", hasTranslation: e[lang] != null && e[lang] !== "" };
    }
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ boot(); adoptProfileLanguage(); });
  else { boot(); adoptProfileLanguage(); }
})();
