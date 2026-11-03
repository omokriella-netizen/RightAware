/**
 * RightAware Safe Markdown & Semantic HTML Parser
 * Zero-dependency, XSS-hardened line-by-line state machine for civic legal guidance.
 */
(function(root) {
  "use strict";

  /**
   * Sanitizes URLs to prevent XSS (javascript:, data:, vbscript:, protocol-relative //)
   * while preserving valid internal guides, hotlines (tel:), and external resources (https:).
   */
  function sanitizeUrl(rawUrl) {
    if (typeof rawUrl !== "string") return "#";

    // Decode &amp; back to & before URL validation to preserve multi-parameter query strings
    const decoded = rawUrl.replace(/&amp;/g, "&").trim();
    const clean = decoded.replace(/[\x00-\x1F\x7F-\x9F\s]/g, "");
    if (!clean) return "#";

    // Explicitly block protocol-relative URLs (e.g. //evil.com or /\evil.com)
    if (clean.startsWith("//") || clean.startsWith("/\\")) {
      return "#";
    }

    // Relative internal paths (single leading slash, ./, #anchor, or alphanumeric html path with optional subdirs)
    if (/^(\/(?!\/)|(?:\.\/)|#|[a-zA-Z0-9_\-\.\/]+\.html(?:[?#]|$))/i.test(clean)) {
      // Prevent protocol confusion attacks like "javascript:rights.html"
      if (clean.includes(":") && !/^(https?|tel|mailto):/i.test(clean)) {
        return "#";
      }
      return clean.replace(/&/g, "&amp;");
    }

    // Absolute URLs: validate protocol against strict allowlist via native URL parser
    try {
      const base = (typeof window !== "undefined" && window.location && window.location.origin)
        ? window.location.origin
        : "http://localhost";
      const parsed = new URL(clean, base);
      const proto = parsed.protocol.toLowerCase();
      if (proto === "https:" || proto === "http:" || proto === "tel:" || proto === "mailto:") {
        return parsed.href.replace(/&/g, "&amp;");
      }
    } catch (_) {
      return "#";
    }

    return "#";
  }

  /**
   * Renders inline markdown: tokenizes code and links first to protect URLs from
   * underscore formatting mutations, then evaluates bold and italics.
   */
  function renderInline(text) {
    if (!text) return "";

    const codeTokens = [];
    const linkTokens = [];

    // Step 1: Tokenize inline code first to protect backtick content
    let protectedText = text.replace(/`([^`]+)`/g, function(_, code) {
      codeTokens.push('<code>' + code + '</code>');
      return "@@RA_CODE_" + (codeTokens.length - 1) + "@@";
    });

    // Step 2: Tokenize markdown links to protect URLs with underscores from italic regex
    protectedText = protectedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, label, url) {
      const safeUrl = sanitizeUrl(url);
      const isInternal = safeUrl.startsWith("/") || safeUrl.startsWith("./") || safeUrl.startsWith("#") || safeUrl.includes(".html");
      const targetRel = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
      linkTokens.push('<a class="ra-ai-doc-link" href="' + safeUrl + '"' + targetRel + '>' + label + '</a>');
      return "@@RA_LINK_" + (linkTokens.length - 1) + "@@";
    });

    // Step 3: Parse Bold and Italics safely on protected text
    let rendered = protectedText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      .replace(/(?:^|\s)_([^_]+?)_(?=\s|$)/g, ' <em>$1</em>'); // Whitespace-bounded underscore italics

    // Step 4: Restore tokens
    rendered = rendered.replace(/@@RA_LINK_(\d+)@@/g, function(_, idx) {
      return linkTokens[parseInt(idx, 10)] || "";
    });
    rendered = rendered.replace(/@@RA_CODE_(\d+)@@/g, function(_, idx) {
      return codeTokens[parseInt(idx, 10)] || "";
    });

    return rendered;
  }

  /**
   * Line-by-line state machine parser.
   * Tracks block states (ROOT, UL, OL, CALLOUT) to guarantee deterministic tag closure.
   */
  function renderMarkdown(rawText) {
    if (!rawText) return "";

    // Step 1: Strict HTML entity escaping
    const escaped = String(rawText)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const lines = escaped.split(/\r?\n/);
    let html = "";
    let currentState = 0; // 0: ROOT, 1: UL, 2: OL, 3: CALLOUT
    let inCallout = false;

    function closeLists() {
      if (currentState === 1) { // UL
        html += "</ul>";
        currentState = inCallout ? 3 : 0;
      }
      if (currentState === 2) { // OL
        html += "</ol>";
        currentState = inCallout ? 3 : 0;
      }
    }

    function closeCallout() {
      closeLists();
      if (inCallout) {
        html += "</div></div>";
        inCallout = false;
        currentState = 0;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        closeLists();
        continue;
      }

      // Callout Section Heading: Unicode alternation group with /u flag
      const calloutMatch = line.match(/^(?:###\s*)?(🛡️|⚖️?|📋|⚠️?|ℹ️?)\s+(.+)$/u);
      if (calloutMatch) {
        closeCallout();
        inCallout = true;
        currentState = 3;
        const icon = calloutMatch[1];
        const title = renderInline(calloutMatch[2]);
        html += '<div class="ra-ai-callout"><div class="ra-ai-callout-header"><span class="ra-ai-callout-icon">' +
          icon + '</span><strong>' + title + '</strong></div><div class="ra-ai-callout-body">';
        continue;
      }

      // Standard Heading: "### Title" (Cleanly breaks out of open callouts)
      const hMatch = line.match(/^###\s+(.+)$/);
      if (hMatch) {
        closeCallout(); // Reset container boundary so next section is not trapped
        html += '<h4 class="ra-ai-heading">' + renderInline(hMatch[1]) + '</h4>';
        continue;
      }

      // Unordered List item: "- item" or "* item"
      const ulMatch = line.match(/^[-*•]\s+(.+)$/);
      if (ulMatch) {
        if (currentState !== 1) {
          if (currentState === 2) closeLists();
          html += '<ul class="ra-ai-list">';
          currentState = 1;
        }
        html += '<li>' + renderInline(ulMatch[1]) + '</li>';
        continue;
      }

      // Ordered List item: "1. item"
      const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        if (currentState !== 2) {
          if (currentState === 1) closeLists();
          html += '<ol class="ra-ai-list">';
          currentState = 2;
        }
        html += '<li>' + renderInline(olMatch[2]) + '</li>';
        continue;
      }

      // Regular paragraph
      closeLists();
      html += '<p class="ra-ai-p">' + renderInline(line) + '</p>';
    }

    closeCallout();
    return html;
  }

  const api = {
    sanitizeUrl: sanitizeUrl,
    renderInline: renderInline,
    renderMarkdown: renderMarkdown
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.RA_AI_RENDERER = api;
})(typeof window !== "undefined" ? window : global);
