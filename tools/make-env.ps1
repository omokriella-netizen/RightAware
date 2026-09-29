# RightAware make-env.ps1 - generates env.local.js from .env.local.
#
# WHY THIS EXISTS
#   The site is static (no build step), so the browser needs public config
#   (Supabase URL + publishable key) as a JS file. .env.local also contains
#   SECRET names (service role, Paystack secret, AI key); those must NEVER
#   reach browser-side code, so this script copies a strict whitelist only.
#
# USAGE (from the project root or anywhere)
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1
#
# OUTPUT
#   env.local.js (git-ignored) - PUBLIC values only, loaded by
#   js/supabase-client.js as the lowest-priority source after
#   window.__ENV__ (server-injected) and localStorage ra_env (manual override).
param(
  [string]$EnvFile = "",
  [string]$OutFile = ""
)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
if (-not $EnvFile) { $EnvFile = Join-Path $root ".env.local" }
if (-not $OutFile) { $OutFile = Join-Path $root "env.local.js" }

# Strict whitelist: only names that are safe in frontend code (ENVIRONMENT.md).
$PUBLIC = @("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "PAYSTACK_PUBLIC_KEY", "TURNSTILE_SITE_KEY")

if (-not (Test-Path $EnvFile)) {
  Write-Host "make-env: no $EnvFile found - skipping (site stays in demo mode)."
  exit 0
}

$vals = @{}
foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
  $t = $line.Trim()
  if (-not $t -or $t.StartsWith("#")) { continue }
  $eq = $t.IndexOf("=")
  if ($eq -lt 1) { continue }
  $name = $t.Substring(0, $eq).Trim()
  $value = $t.Substring($eq + 1).Trim().Trim('"').Trim("'")
  if ($PUBLIC -contains $name -and $value) { $vals[$name] = $value }
}

if (-not $vals.ContainsKey("SUPABASE_URL") -or -not $vals.ContainsKey("SUPABASE_PUBLISHABLE_KEY")) {
  Write-Host "make-env: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY missing or empty in .env.local - no file written."
  exit 1
}
if ($vals["SUPABASE_URL"] -notmatch "^https://") {
  Write-Host "make-env: SUPABASE_URL must be an https:// URL - no file written."
  exit 1
}
if ($vals["SUPABASE_URL"] -notmatch "\.supabase\.(co|in)(/|$)") {
  Write-Host ("make-env: WARNING - SUPABASE_URL '" + $vals["SUPABASE_URL"] + "' does not look like a Supabase project URL. Writing it anyway - double-check before use.")
}
if ($vals["SUPABASE_PUBLISHABLE_KEY"] -notmatch "^(sb_publishable_|sbp_|eyJ)") {
  Write-Host "make-env: WARNING - SUPABASE_PUBLISHABLE_KEY does not look like a publishable/anon key. Double-check it is NOT a secret/service key."
}

function JsonEscape([string]$s) {
  $r = $s.Replace('\', '\\')
  $r = $r.Replace('"', '\"')
  $r = $r.Replace("`n", '\n')
  $r = $r.Replace("`r", '\r')
  return $r
}

$pairs = @()
foreach ($k in ($vals.Keys | Sort-Object)) {
  $pairs += ('  "' + $k + '": "' + (JsonEscape $vals[$k]) + '"')
}
$body = $pairs -join ("," + [Environment]::NewLine)

$text = @"
/* RightAware local public environment - GENERATED FILE (git-ignored).
   Source : .env.local
   Regen : powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-env.ps1
   PUBLIC values only - safe to load in the browser. Secret keys
   (SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY, AI_API_KEY) are never
   copied here by the generator. Loaded by js/supabase-client.js. */
window.__ENV__ = window.__ENV__ || {};
(function (pub) {
  for (var k in pub) {
    if (Object.prototype.hasOwnProperty.call(pub, k) && pub[k] && !window.__ENV__[k]) window.__ENV__[k] = pub[k];
  }
})({
$body
});
"@

[System.IO.File]::WriteAllText($OutFile, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("make-env: wrote " + $OutFile + " with keys: " + (($vals.Keys | Sort-Object) -join ", "))
