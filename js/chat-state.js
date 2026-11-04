/* RightAware Chat State Transit Manager
   Enforces Single Ownership for thread transit between index.html and ai.html
   and client-side quota synchronization per .agents/rules/state-invariants.md. */
(function(){
  "use strict";

  const STORAGE_KEY = "ra_pending_chat";
  const GUEST_STATE_KEY = "ra_guest_state";
  const GUEST_COUNT_KEY = "ra_guest_prompt_count";
  const ACTIVE_SESSION_KEY = "ra_ai_active_session_id";
  const MAX_PREVIEWS = 3;
  const MAX_SESSIONS = 20;
  const MAX_MESSAGES_PER_SESSION = 30;
  const TTL_MS = 24 * 60 * 60 * 1000; // 24-hour sliding window TTL

  function getSessionsKey(){
    try {
      if(window.RA_AUTH && typeof window.RA_AUTH.current === "function"){
        var u = window.RA_AUTH.current();
        var uid = u && (u.supabaseId || u.id || u.email);
        if(uid) return "ra_ai_sessions_" + uid;
      }
    } catch(_) {}
    return "ra_ai_sessions_guest";
  }

  function deriveTitle(prompt){
    var clean = String(prompt || "").trim()
      .replace(/[\r\n\t]+/g, " ")
      .replace(/^[#*\-•\s]+/, "");
    if(!clean) return "New Inquiry";
    if(clean.length > 34){
      return clean.slice(0, 31) + "…";
    }
    return clean;
  }

  function safeStorageWrite(key, value){
    try {
      localStorage.setItem(key, value);
      return true;
    } catch(err){
      // Defensive LRU eviction if quota is exceeded
      try {
        var raw = localStorage.getItem(key);
        if(raw){
          var list = JSON.parse(raw);
          if(Array.isArray(list) && list.length > 5){
            list.splice(list.length - 5, 5); // Evict 5 oldest sessions
            localStorage.setItem(key, JSON.stringify(list));
            return true;
          }
        }
      } catch(_) {}
      return false;
    }
  }

  const ChatState = {
    MAX_PREVIEWS: MAX_PREVIEWS,
    MAX_SESSIONS: MAX_SESSIONS,

    /* ---------------------------------------------------------
       MULTI-SESSION PERSISTENCE MANAGER
       --------------------------------------------------------- */

    getSessions: function(){
      try {
        var key = getSessionsKey();
        var raw = localStorage.getItem(key);
        if(!raw) return [];
        var parsed = JSON.parse(raw);
        if(!Array.isArray(parsed)) return [];
        return parsed.filter(function(s){
          return s && typeof s.id === "string" && Array.isArray(s.messages);
        }).sort(function(a, b){
          return (Number(b.updatedAt) || Number(b.createdAt) || 0) - (Number(a.updatedAt) || Number(a.createdAt) || 0);
        });
      } catch(_) {
        return [];
      }
    },

    getSession: function(id){
      if(!id) return null;
      var sessions = this.getSessions();
      for(var i = 0; i < sessions.length; i++){
        if(sessions[i].id === id) return sessions[i];
      }
      return null;
    },

    createSession: function(firstPrompt){
      var sessions = this.getSessions();
      var id = "ra_sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      var title = deriveTitle(firstPrompt);
      var now = Date.now();

      var newSession = {
        id: id,
        title: title,
        createdAt: now,
        updatedAt: now,
        messages: []
      };

      sessions.unshift(newSession);
      if(sessions.length > MAX_SESSIONS){
        sessions = sessions.slice(0, MAX_SESSIONS);
      }

      safeStorageWrite(getSessionsKey(), JSON.stringify(sessions));
      this.setActiveSessionId(id);
      return newSession;
    },

    saveSession: function(session){
      if(!session || !session.id) return false;
      var sessions = this.getSessions();
      var idx = -1;
      for(var i = 0; i < sessions.length; i++){
        if(sessions[i].id === session.id){
          idx = i;
          break;
        }
      }

      session.updatedAt = Date.now();
      if(Array.isArray(session.messages) && session.messages.length > MAX_MESSAGES_PER_SESSION){
        session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
      }

      if(idx >= 0){
        sessions[idx] = session;
      } else {
        sessions.unshift(session);
      }

      if(sessions.length > MAX_SESSIONS){
        sessions = sessions.slice(0, MAX_SESSIONS);
      }

      // Re-sort descending
      sessions.sort(function(a, b){
        return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
      });

      return safeStorageWrite(getSessionsKey(), JSON.stringify(sessions));
    },

    deleteSession: function(id){
      if(!id) return false;
      var sessions = this.getSessions().filter(function(s){
        return s.id !== id;
      });
      safeStorageWrite(getSessionsKey(), JSON.stringify(sessions));
      if(this.getActiveSessionId() === id){
        this.setActiveSessionId(null);
      }
      return true;
    },

    getActiveSessionId: function(){
      try {
        return localStorage.getItem(ACTIVE_SESSION_KEY) || sessionStorage.getItem(ACTIVE_SESSION_KEY) || null;
      } catch(_) {
        return null;
      }
    },

    setActiveSessionId: function(id){
      try {
        if(id){
          localStorage.setItem(ACTIVE_SESSION_KEY, String(id));
          sessionStorage.setItem(ACTIVE_SESSION_KEY, String(id));
        } else {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
          sessionStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      } catch(_) {}
    },

    addMessageToActiveSession: function(role, text, links, sourceLabel, timeStr){
      var activeId = this.getActiveSessionId();
      var session = activeId ? this.getSession(activeId) : null;
      if(!session){
        session = this.createSession(text);
      } else if(session.messages.length === 0 && role === "user"){
        session.title = deriveTitle(text);
      }

      var msg = {
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        role: role === "user" ? "user" : "assistant",
        text: String(text || "").slice(0, 4000),
        links: Array.isArray(links) ? links.slice(0, 6) : [],
        sourceLabel: sourceLabel || "",
        timestamp: timeStr || "",
        createdAt: Date.now()
      };

      session.messages.push(msg);
      this.saveSession(session);
      return session;
    },

    /* ---------------------------------------------------------
       GUEST QUOTA & TRANSIT STATE
       --------------------------------------------------------- */

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
