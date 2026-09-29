/* RightAware build-time public environment generator (Vercel build step).
 *
 * WHY THIS EXISTS
 *   The site is static. The browser gets public config (Supabase URL +
 *   publishable key + Turnstile SITE key) from env.local.js, which is
 *   git-ignored - so a plain Vercel deploy never has it and the frontend
 *   silently falls back to demo mode. Vercel runs this file as the Build
 *   Command, so env.local.js exists at the site root BEFORE static files
 *   are collected and served.
 *
 * USAGE
 *   node tools/make-env.vercel.js [--out <path>]
 *
 * SOURCES (later wins)
 *   1) .env.local            - local parity with tools\make-env.ps1
 *   2) process.env           - Vercel environment variables (Production/Preview)
 *
 * OUTPUT
 *   env.local.js - PUBLIC values only, byte-compatible with the output of
 *   tools\make-env.ps1 (js/supabase-client.js loads either one).
 *   Secrets (SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY,
 *   PAYSTACK_SECRET_KEY, AI keys) are NEVER read: only the fixed whitelist
 *   below can be written, so a secret set in Vercel cannot leak into the
 *   browser even by mistake.
 *
 * LOCAL WORKFLOW UNCHANGED
 *   Windows/local builds keep using:
 *     powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1
 *
 * NOTE: written in plain ES3-style JavaScript on purpose - it runs on any
 * Node version Vercel picks, and it stays testable on machines without Node.
 */
"use strict";

var fs = require("node:fs");
var path = require("node:path");

// Strict whitelist: names that are safe in frontend code (docs/ENVIRONMENT.md).
var PUBLIC = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "PAYSTACK_PUBLIC_KEY", "TURNSTILE_SITE_KEY"];

var root = path.resolve(__dirname, "..");
var outPath = path.join(root, "env.local.js");
for (var a = 0; a < process.argv.length; a++) {
  if (process.argv[a] === "--out" && process.argv[a + 1]) outPath = path.resolve(root, process.argv[a + 1]);
}

function has(arr, v) {
  for (var i = 0; i < arr.length; i++) { if (arr[i] === v) return true; }
  return false;
}
function trim(s) { return String(s).replace(/^\s+|\s+$/g, ""); }

var vals = {};
function keep(name, value) { if (has(PUBLIC, name) && value) vals[name] = value; }

// 1) Local .env.local (same parsing rules as tools\make-env.ps1).
var envFile = path.join(root, ".env.local");
var haveEnvFile = fs.existsSync(envFile);
if (haveEnvFile) {
  var lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var t = trim(lines[i]);
    if (!t || t.charAt(0) === "#") continue;
    var eq = t.indexOf("=");
    if (eq < 1) continue;
    var name = trim(t.slice(0, eq));
    var value = trim(t.slice(eq + 1));
    if (
      (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
      (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")
    ) {
      value = value.slice(1, -1);
    }
    keep(name, value);
  }
}

// 2) Vercel build environment always wins.
for (var p = 0; p < PUBLIC.length; p++) {
  var envVal = process.env[PUBLIC[p]];
  if (envVal) keep(PUBLIC[p], envVal);
}

var isProduction = process.env.VERCEL_ENV === "production";

if (!vals.SUPABASE_URL || !vals.SUPABASE_PUBLISHABLE_KEY) {
  var missing =
    "make-env.vercel: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not available. " +
    "Set them in Vercel -> Settings -> Environment Variables (Production) and redeploy.";
  if (isProduction) {
    console.error("ERROR: " + missing + " Refusing to build a demo-mode production site.");
    process.exit(1);
  }
  console.warn("WARNING: " + missing + " Preview build continues without env.local.js.");
  process.exit(0);
}
if (!/^https:\/\//.test(vals.SUPABASE_URL)) {
  console.error("ERROR: make-env.vercel: SUPABASE_URL must be an https:// URL. Refusing to build.");
  process.exit(1);
}
if (!/\.supabase\.(co|in)(\/|$)/.test(vals.SUPABASE_URL)) {
  console.warn("WARNING: make-env.vercel: SUPABASE_URL does not look like a Supabase project URL: " + vals.SUPABASE_URL);
}
if (!/^(sb_publishable_|sbp_|eyJ)/.test(vals.SUPABASE_PUBLISHABLE_KEY)) {
  console.warn(
    "WARNING: make-env.vercel: SUPABASE_PUBLISHABLE_KEY does not look like a publishable key. " +
      "Double-check it is NOT a secret/service key."
  );
}
if (vals.SUPABASE_PUBLISHABLE_KEY.toLowerCase().indexOf("service") !== -1) {
  console.error("ERROR: make-env.vercel: that looks like a SERVICE ROLE key. Refusing to write it.");
  process.exit(1);
}

function jsonEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

var keys = [];
for (var k in vals) { if (Object.prototype.hasOwnProperty.call(vals, k)) keys.push(k); }
keys.sort();

var pairs = [];
for (var q = 0; q < keys.length; q++) {
  pairs.push('  "' + keys[q] + '": "' + jsonEscape(vals[keys[q]]) + '"');
}
var body = pairs.join(",\n");

var text =
  "/* RightAware public environment - GENERATED FILE (git-ignored).\n" +
  "   Source : Vercel build environment" + (haveEnvFile ? " + .env.local" : "") + "\n" +
  "   Regen  : Vercel build (node tools/make-env.vercel.js)\n" +
  "            local: powershell -NoProfile -ExecutionPolicy Bypass -File tools\\make-env.ps1\n" +
  "   PUBLIC values only - safe to load in the browser. Secrets\n" +
  "   (SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY, PAYSTACK_SECRET_KEY, AI keys)\n" +
  "   are never copied here: the generator only writes a fixed whitelist.\n" +
  "   Loaded by js/supabase-client.js. */\n" +
  "window.__ENV__ = window.__ENV__ || {};\n" +
  "(function (pub) {\n" +
  "  for (var k in pub) {\n" +
  "    if (Object.prototype.hasOwnProperty.call(pub, k) && pub[k] && !window.__ENV__[k]) window.__ENV__[k] = pub[k];\n" +
  "  }\n" +
  "})({\n" +
  body +
  "\n});\n";

fs.writeFileSync(outPath, text, "utf8");
console.log("make-env.vercel: wrote " + outPath + " with keys: " + keys.join(", "));
