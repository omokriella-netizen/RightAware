/* RightAware Chat State Transit Manager
   Enforces Single Ownership for thread transit between index.html and ai.html
   and client-side quota synchronization per .agents/rules/state-invariants.md. */
(function(){
  "use strict";

  const STORAGE_KEY = "ra_pending_chat";
  const GUEST_STATE_KEY = "ra_guest_state";
  const GUEST_COUNT_KEY = "ra_guest_prompt_count";
  const MAX_PREVIEWS = 3;
  const TTL_MS = 24 * 60 * 60 * 1000; // 24-hour sliding window TTL

  const ChatState = {
    MAX_PREVIEWS: MAX_PREVIEWS,

    getGuestPromptCount: function(){
      try {
        // 1. Authoritative localStorage state with timestamp verification
        var raw = localStorage.getItem(GUEST_STATE_KEY);
        if(raw){
          var parsed = JSON.parse(raw);
          if(parsed && typeof parsed.count === "number"){
            var ts = Number(parsed.ts) || 0;
            if(Date.now() - ts < TTL_MS){
              return Math.max(0, parsed.count);
            } else {
              // Sliding window elapsed (>24h): reset count
              this.setGuestPromptCount(0);
              return 0;
            }
          }
        }
        // 2. Backward compatibility fallback
        var legacy = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || sessionStorage.getItem(GUEST_COUNT_KEY) || "0", 10);
        return isNaN(legacy) || legacy < 0 ? 0 : legacy;
      } catch(_) {
        return 0;
      }
    },

    setGuestPromptCount: function(count){
      try {
        var c = parseInt(count, 10);
        c = isNaN(c) || c < 0 ? 0 : c;
        var targetTs = Date.now();
        if(c > 0){
          try {
            var raw = localStorage.getItem(GUEST_STATE_KEY);
            if(raw){
              var parsed = JSON.parse(raw);
              if(parsed && typeof parsed.count === "number" && parsed.count > 0 && typeof parsed.ts === "number" && (Date.now() - parsed.ts < TTL_MS)){
                targetTs = parsed.ts; // Preserve original sliding window start timestamp
              }
            }
          } catch(_) {}
        }
        var payload = { count: c, ts: targetTs };
        localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(payload));
        localStorage.setItem(GUEST_COUNT_KEY, String(c));
        sessionStorage.setItem(GUEST_COUNT_KEY, String(c));
        return c;
      } catch(_) {
        return count || 0;
      }
    },

    incrementGuestPromptCount: function(){
      try {
        var cur = this.getGuestPromptCount();
        var next = cur + 1;
        this.setGuestPromptCount(next);
        return next;
      } catch(_) {
        return 1;
      }
    },

    hasReachedLimit: function(){
      return this.getGuestPromptCount() >= MAX_PREVIEWS;
    },

    resetGuestPromptCount: function(){
      return this.setGuestPromptCount(0);
    },

    saveTransitThread: function(messages){
      try {
        if (!Array.isArray(messages)) return false;
        // Strictly sanitize and bound payload
        const sanitized = messages.slice(-10).map(function(m){
          return {
            role: m.role === "ai" ? "ai" : "user",
            text: String(m.text || "").slice(0, 3000),
            links: Array.isArray(m.links) ? m.links.slice(0, 5).map(function(l){
              return {
                t: String((l && l.t) || "").slice(0, 100),
                u: String((l && l.u) || "").slice(0, 200)
              };
            }) : [],
            ts: Date.now()
          };
        });
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        return true;
      } catch(_) {
        return false;
      }
    },

    consumeTransitThread: function(){
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        // Single Ownership Handover: immediately remove transit envelope
        sessionStorage.removeItem(STORAGE_KEY);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter(function(m){
          return m && typeof m.text === "string" && (m.role === "ai" || m.role === "user");
        });
      } catch(_) {
        return null;
      }
    }
  };

  window.RA_CHAT_STATE = ChatState;
})();
