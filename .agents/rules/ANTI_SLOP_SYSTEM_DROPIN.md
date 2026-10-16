# ANTI-SLOP SYSTEM: PRODUCTION DROP-IN SPECIFICATION
> **Drop-In Location:** Copy this file directly into `.agents/rules/ANTI_SLOP.md`, `GEMINI.md`, `CLAUDE.md`, or `.cursorrules` in any client repository.

---

## 1. ARCHITECTURAL PHILOSOPHY & NON-NEGOTIABLES

This specification forces LLMs and front-end engineers out of default "AI UI Slop" (purple gradients, rounded pill badges, floating drop shadows, generic icon-in-circle cards, and empty buzzwords like *elevate*, *seamless*, and *empower*).

Instead, layouts are governed by:
- **Swiss International Typographic Style** (Müller-Brockmann grid disciplines, high typographic hierarchy, and structural rules).
- **Zero-Asset Design Engineering** (Instant visual authority without relying on stock photos or 3D illustrations).
- **Deterministic Hairline Grids** (`gap: 1px` with background color bleed, hardened against subpixel jitter and mobile overflow).
- **Audience-Specific Temperature** (Warm, scholarly dignity for institutions; stark, machined precision for industrial B2B).

---

## 2. HARD BANS

| Category | Banned Element | Required Engineering Alternative |
| :--- | :--- | :--- |
| **Visual** | Emojis & Unicode sparkles (`✨`, `✦`, `🚀`, `→`) | Clean inline SVGs (`stroke-width: 1.5px`) or ASCII in `<code>` tags. |
| **Visual** | Pill badges (`border-radius: 9999px` / `rounded-full`) | Flush-left baseline monospace eyebrows (`font-size: 0.75rem`, `letter-spacing: 0.08em`, uppercase). |
| **Visual** | Icon-in-circle 3-column feature cards | Horizontal ruled ledgers (`<ol>`) or asymmetric 6-column bento grids. |
| **Visual** | Floating card drop shadows (`box-shadow: 0 10px...`) | Surface contrast shifts (`--bg-primary` vs `--bg-surface`) + 1px hairline rules. |
| **Visual** | Centered hero stacks (H1, text, CTAs centered) | Asymmetric multi-column architecture (65% Proposition / 35% Ledger). |
| **Visual** | `overflow-x: hidden` on `body` as a responsive fix | Enforce `min-width: 0` on grid/flex children and collapse tracks at `768px`. |
| **Copy** | Em-dashes (`—`) or en-dashes (`–`) | Full stops, colons, semicolons, or parenthetical qualifiers. |
| **Copy** | Buzzwords: *Elevate, Seamless, Unleash, Cutting-edge, Tailored, Empower, Revolutionize, Next-gen, Beacon, Fostering, Comprehensive.* | Concrete operational nouns, quantitative metrics, or statutory accreditations. |

---

## 3. RESPONSIVE GRID ENGINES (VANILLA CSS)

### Engine 1: Asymmetric Hero Split (65% Proposition / 35% Ledger)
```css
.hero-split-grid {
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: clamp(2rem, 4vw, 4rem);
  align-items: start;
  min-width: 0;
}

@media (max-width: 768px) {
  .hero-split-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}
```

### Engine 2: Pattern A (Ruled Horizontal Ledger)
```css
.ruled-ledger {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--border-strong);
}

.ledger-row {
  display: grid;
  grid-template-columns: 4rem 1.8fr 1.2fr auto;
  gap: clamp(1rem, 2vw, 2.5rem);
  align-items: baseline;
  padding: 1.75rem 0;
  border-bottom: 1px solid var(--border-hairline);
  min-width: 0;
}

@media (max-width: 768px) {
  .ledger-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1.5rem 0;
  }
}
```

### Engine 3: Pattern B (6-Column Hairline Border-Bleed Bento Grid)
```css
.hairline-bento-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background-color: var(--border-hairline);
  box-sizing: border-box;
}

.hairline-bento-cell {
  background-color: var(--bg-primary);
  background-clip: padding-box;
  padding: clamp(1.5rem, 3.5vw, 3rem);
  min-width: 0;
}

@media (max-width: 768px) {
  .hairline-bento-grid {
    grid-template-columns: 1fr;
  }
  .hairline-bento-cell {
    grid-column: 1 / -1 !important;
  }
}

/* Subpixel Anti-Jitter Fallback for High-DPI Windows Scaling */
@media (-webkit-min-device-pixel-ratio: 1.25), (min-resolution: 120dpi) {
  .hairline-bento-grid {
    background-color: transparent;
    gap: 0;
  }
  .hairline-bento-cell {
    border: 1px solid var(--border-hairline);
    margin-bottom: -1px;
    margin-right: -1px;
  }
}
```

---

## 4. DUAL TOKEN ARCHETYPES

### Archetype A: Institutional Heritage & Warm Editorial
*For: Schools, Universities, Academies, Clinics, Law Chambers, Consultancies.*
```css
:root[data-archetype="A"] {
  --bg-primary: #FAF7F2;          /* Warm Alabaster */
  --bg-surface: #F3EFE6;          /* Muted Parchment */
  --bg-ink: #14241B;              /* Deep Academic Forest / Oxford Ink */
  --text-primary: #181816;        /* Warm Charcoal */
  --text-secondary: #524E48;      /* Stone Gray */
  --text-muted: #847E74;          /* Archival numbering */
  --text-inverted: #FAF7F2;       /* Alabaster on ink */
  --accent-primary: #8C2D19;      /* Terracotta / Oxblood Seal */
  --border-hairline: #DED8CE;     /* Warm stone rule */
  --border-strong: #181816;       /* Solid header delimiter */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-sharp: 0px;
}
```

### Archetype B: Swiss Industrial & Operational Precision
*For: Construction, Engineering, Logistics, MEP, Manufacturing, Tech Infrastructure.*
```css
:root[data-archetype="B"] {
  --bg-primary: #F4F4F0;          /* Architectural Concrete */
  --bg-surface: #EAEAE4;          /* Secondary Cell */
  --bg-ink: #111315;              /* Carbon Steel */
  --text-primary: #111315;        /* Stark Carbon */
  --text-secondary: #45494D;      /* Machined Slate */
  --text-muted: #74787E;          /* Spec indices */
  --text-inverted: #F4F4F0;       /* High-contrast light text */
  --accent-primary: #D9381E;      /* International Signal Orange */
  --border-hairline: #D0D0C8;     /* 1px Blueprint line */
  --border-strong: #111315;       /* Structural boundary rule */
  --font-display: 'Space Grotesk', sans-serif;
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --radius-sharp: 0px;
}
```

---

## 5. CLIENT INTAKE PRE-PROCESSOR PROMPT (30 SECONDS)

When onboarding any new client, paste this prompt into your LLM along with their WhatsApp messages or draft copy:

```markdown
Role: Front-End Architecture & Zero-Slop Copy Linter.
Task: Parse the attached raw client brief and output a strictly compliant `03_CLIENT_PAYLOAD.md` adhering to the Anti-Slop schema.

Constraints:
1. Ban words: elevate, seamless, unleash, cutting-edge, tailored, empower, revolutionize, next-gen, beacon, fostering, holistic, world-class.
2. Ban em-dashes (—).
3. Select Archetype A (Institutional) or Archetype B (Industrial).
4. Override --accent-primary with their brand hex color.
5. Provide exactly 5 deterministic rows for the Right-Pane Hero Ledger with verifiable credentials, ratios, metrics, and dates. If details are missing, provide concrete institutional estimates bracketed in [NEEDS_CLIENT_CONFIRMATION: ...].

[ATTACH RAW NOTES HERE]
```

---

## 6. PRE-FLIGHT VERIFICATION AUDIT

Before any page is approved for staging or production, execute this checklist:
- [ ] **Mobile Collapse:** Test viewport at 375px width. Does any element cause horizontal scroll?
- [ ] **Emoji Scan:** Regex search `[\u{1F600}-\u{1F6FF}]` across all markup. Matches must be 0.
- [ ] **Em-Dash Scan:** Search for `—` across all `.html` and `.jsx/.vue` files. Matches must be 0.
- [ ] **Buzzword Scan:** Run case-insensitive grep for `elevate|seamless|unleash|cutting-edge|empower|revolutionize`.
- [ ] **Semantic Ledger Check:** Verify the Hero Ledger is built with `<dl>`, `<dt>`, `<dd>` (not generic `<div>` soup).
- [ ] **Focus Rings:** Tab through with keyboard; confirm `:focus-visible` triggers 2px high-contrast outline.
