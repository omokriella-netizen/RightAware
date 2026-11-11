/* =========================================================================
   RIGHTAWARE ZERO-TRUST TTS AUDIO PLAYER (js/tts-player.js)
   Single-responsibility audio controller with mutation locks, active memory
   cache, mobile autoplay preservation, localized state dictionaries, and
   race-safe abort controllers.
   ========================================================================= */

(function (window) {
  "use strict";

  var currentAudio = null;
  var currentButton = null;
  var activeAbortController = null;
  var errorTimeoutId = null;

  // Active in-memory cache: "lang:normalizedText" -> audioUrl (0-network replay)
  var audioMemoryCache = new Map();

  // Localized UI strings for all player states
  var UI_STRINGS = {
    en: {
      listen: "Listen",
      loading: "Loading audio...",
      stop: "Stop",
      error: "Audio unavailable",
      tapToPlay: "Tap to play"
    },
    yo: {
      listen: "Gbọ́",
      loading: "N gbà á wọlé...",
      stop: "Dúró",
      error: "Ohun kò sí",
      tapToPlay: "Tẹ́ ẹ láti gbọ́"
    },
    ig: {
      listen: "Gee ntị",
      loading: "Na-ebudata...",
      stop: "Kwụsị",
      error: "Ọ dịghị ụda",
      tapToPlay: "Kpatụ ka ị gee"
    },
    ha: {
      listen: "Saurara",
      loading: "Ana lodawa...",
      stop: "Tsaya",
      error: "Babu sauti",
      tapToPlay: "Danna don saurare"
    },
    pcm: {
      listen: "Listen",
      loading: "De load audio...",
      stop: "Stop",
      error: "Audio no dey",
      tapToPlay: "Tap to play"
    }
  };

  function getStrings(lang) {
    return UI_STRINGS[lang] || UI_STRINGS.en;
  }

  function clearPendingErrorTimer() {
    if (errorTimeoutId) {
      clearTimeout(errorTimeoutId);
      errorTimeoutId = null;
    }
  }

  function stopCurrentAudio() {
    // 1. Clear any active error badge timers to avoid resetting new button states
    clearPendingErrorTimer();

    // 2. Abort in-flight fetch immediately
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    // 3. Pause and disconnect current HTML5 Audio
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_) {}
      currentAudio = null;
    }

    // 4. Reset button UI
    if (currentButton) {
      resetButtonUI(currentButton);
      currentButton = null;
    }
  }

  function resetButtonUI(btn) {
    btn.disabled = false;
    btn.classList.remove("ra-tts-loading", "ra-tts-playing", "ra-tts-error");
    var lang = btn.getAttribute("data-lang") || "en";
    var str = getStrings(lang);
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'
      + '<span>' + str.listen + '</span>';
  }

  function setPlayingUI(btn) {
    clearPendingErrorTimer();
    btn.disabled = false;
    btn.classList.remove("ra-tts-loading", "ra-tts-error");
    btn.classList.add("ra-tts-playing");
    var lang = btn.getAttribute("data-lang") || "en";
    var str = getStrings(lang);
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
      + '<span>' + str.stop + '</span>';
  }

  function setLoadingUI(btn) {
    clearPendingErrorTimer();
    btn.disabled = true; // Mutation lock against double-clicks
    btn.classList.remove("ra-tts-error", "ra-tts-playing");
    btn.classList.add("ra-tts-loading");
    var lang = btn.getAttribute("data-lang") || "en";
    var str = getStrings(lang);
    btn.innerHTML = '<span class="ra-tts-spinner" aria-hidden="true"></span>'
      + '<span>' + str.loading + '</span>';
  }

  function showErrorUI(btn, customMessage) {
    clearPendingErrorTimer();
    btn.disabled = false;
    btn.classList.remove("ra-tts-loading", "ra-tts-playing");
    btn.classList.add("ra-tts-error");
    var lang = btn.getAttribute("data-lang") || "en";
    var str = getStrings(lang);
    btn.innerHTML = '<span>' + (customMessage || str.error) + '</span>';
    
    errorTimeoutId = setTimeout(function () {
      btn.classList.remove("ra-tts-error");
      resetButtonUI(btn);
      errorTimeoutId = null;
    }, 3500);
  }

  function playAudioStream(audioUrl, btn, lang) {
    var str = getStrings(lang);
    var audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = function () {
      resetButtonUI(btn);
      currentAudio = null;
      currentButton = null;
    };

    audio.onerror = function () {
      showErrorUI(btn, str.error);
      currentAudio = null;
      currentButton = null;
    };

    // Mobile Autoplay Activation Defense:
    // Attempt playback immediately. If the user-gesture token expired during network fetch,
    // transition cleanly to a localized "Tap to Play" prompt without discarding the primed audio object!
    var playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(function () {
          setPlayingUI(btn);
        })
        .catch(function (e) {
          if (e.name === "NotAllowedError") {
            btn.disabled = false;
            btn.classList.remove("ra-tts-loading");
            btn.innerHTML = '<span>' + str.tapToPlay + '</span>';
            // Audio remains primed on currentAudio; subsequent user click plays immediately!
          } else {
            showErrorUI(btn, str.error);
            currentAudio = null;
            currentButton = null;
          }
        });
    } else {
      setPlayingUI(btn);
    }
  }

  var TTSPlayer = {
    stop: stopCurrentAudio,
    play: async function (btn, text, language, voiceId) {
      if (!btn || !text || !language) return;

      var lang = (language || "en").toLowerCase();
      var str = getStrings(lang);
      var cacheKey = lang + ":" + text.trim();

      // Toggle action: Clicking playing button stops playback
      if (currentButton === btn && currentAudio) {
        if (!currentAudio.paused) {
          stopCurrentAudio();
          return;
        } else {
          // If paused or waiting in tapToPlay state, resume directly
          currentAudio.play().then(function () {
            setPlayingUI(btn);
          }).catch(function () {
            showErrorUI(btn, str.error);
          });
          return;
        }
      }

      // Stop any other active playback or in-flight fetch across the page
      stopCurrentAudio();

      currentButton = btn;

      // 1. ACTIVE CACHE CHECK: Zero-network replay
      if (audioMemoryCache.has(cacheKey)) {
        var cachedUrl = audioMemoryCache.get(cacheKey);
        playAudioStream(cachedUrl, btn, lang);
        return;
      }

      // 2. NETWORK PATH: Lock UI and initiate fetch with AbortController
      setLoadingUI(btn);
      activeAbortController = new AbortController();

      try {
        var endpoint = (window.RA_CONFIG && RA_CONFIG.TTS_ENDPOINT) || "/functions/v1/synthesize-indigenous-speech";

        // Map pcm to Nigerian English voice (idera) for speech synthesis
        var requestLang = lang === "pcm" ? "en" : lang;
        var requestVoice = voiceId || (lang === "pcm" ? "idera" : undefined);

        var res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: activeAbortController.signal,
          body: JSON.stringify({
            text: text,
            language: requestLang,
            voice_id: requestVoice
          })
        });

        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }

        var data = await res.json();
        if (!data || !data.audio_url) {
          throw new Error("Missing audio_url");
        }

        // Cache the verified CDN audio URL in local memory
        audioMemoryCache.set(cacheKey, data.audio_url);

        // Reset abort controller reference as request completed
        activeAbortController = null;

        // Play the stream
        playAudioStream(data.audio_url, btn, lang);

      } catch (err) {
        // If aborted due to user clicking another message, ignore silently
        if (err.name === "AbortError") {
          return;
        }
        console.error("RightAware TTS Failure:", err);
        showErrorUI(btn, str.error);
        currentButton = null;
      }
    }
  };

  window.RA_TTS_PLAYER = TTSPlayer;
})(window);

