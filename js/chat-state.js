/* RightAware Chat State Transit Manager
   Enforces Single Ownership for thread transit between index.html and ai.html
   per .agents/rules/state-invariants.md. */
(function(){
  "use strict";

  const STORAGE_KEY = "ra_pending_chat";
  const GUEST_COUNT_KEY = "ra_guest_prompt_count";
  const MAX_PREVIEWS = 3;

  const ChatState = {
    MAX_PREVIEWS: MAX_PREVIEWS,

    getGuestPromptCount: function(){
      try {
        const val = parseInt(sessionStorage.getItem(GUEST_COUNT_KEY) || "0", 10);
        return isNaN(val) || val < 0 ? 0 : val;
      } catch(_) {
        return 0;
      }
    },

    incrementGuestPromptCount: function(){
      try {
        const next = this.getGuestPromptCount() + 1;
        sessionStorage.setItem(GUEST_COUNT_KEY, String(next));
        return next;
      } catch(_) {
        return 1;
      }
    },

    hasReachedLimit: function(){
      return this.getGuestPromptCount() >= MAX_PREVIEWS;
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
