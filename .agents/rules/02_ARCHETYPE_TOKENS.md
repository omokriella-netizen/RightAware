# 02_ARCHETYPE_TOKENS: DUAL-ARCHETYPE DESIGN SYSTEM
**Role:** Deterministic CSS Custom Properties and Typography Rules.
**Rule of Engagement:** The agent MUST inject only ONE active archetype's tokens into the root stylesheet, selected strictly via `03_CLIENT_PAYLOAD.md`.

---

## ARCHETYPE A: "INSTITUTIONAL HERITAGE & WARM EDITORIAL"

### Intended Audiences
Private Academies, Secondary & Tertiary Institutions, University Presses, Legal Chambers, Specialized Medical Clinics, Human-Centric Consultancies.

### Visual Vibe
Oxford University Press meets contemporary architectural editorial. Scholarly, warm, dignified, and trustworthy without cold technocratic alienation.

### 1. Google Fonts `<head>` Embed
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

### 2. CSS Custom Properties (:root)
```css
:root {
  /* Surface Tokens (Warm Alabaster & Oxford Ink) */
  --bg-primary: #FAF7F2;          /* Warm Alabaster Paper - Never cold #FFFFFF */
  --bg-surface: #F3EFE6;          /* Muted Parchment for secondary cards/cells */
  --bg-surface-hover: #ECE6DA;    /* Hover feedback state */
  --bg-ink: #14241B;              /* Deep Academic Forest / Oxford Ink */
  --bg-ink-surface: #1C3326;      /* Elevated cell within dark section */

  /* Text & Contrast Tokens (WCAG AAA Compliant) */
  --text-primary: #181816;        /* Deep Charcoal Ink on warm paper */
  --text-secondary: #524E48;      /* Warm Stone Gray (Optimized for 55ch-65ch body) */
  --text-muted: #847E74;          /* Archival index numbering, metadata, captions */
  --text-inverted: #FAF7F2;       /* Alabaster text rendered on --bg-ink */
  --text-inverted-muted: #A3AFA8; /* Secondary captions on --bg-ink */

  /* Brand & Accent Tokens */
  --accent-primary: #8C2D19;      /* Terracotta / Academic Oxblood Crest Accent */
  --accent-primary-hover: #732312;/* Focus and pressed state */
  --accent-soft: #F0E2DE;         /* Very soft terracotta tint for subtle indicators */

  /* Structural Rules & Borders */
  --border-hairline: #DED8CE;     /* Warm stone 1px structural separator */
  --border-strong: #181816;       /* Editorial top rules, ledger section breaks */
  --border-inverted: #2E4738;     /* Hairline borders within --bg-ink surfaces */

  /* Typographic Stacks */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

  /* Fluid Typographic Scales */
  --font-size-hero: clamp(2.75rem, 5.5vw + 1rem, 5rem);
  --font-size-h2: clamp(2rem, 3.5vw + 0.5rem, 3.25rem);
  --font-size-h3: clamp(1.35rem, 1.8vw + 0.3rem, 1.85rem);
  --font-size-body: clamp(1rem, 0.4vw + 0.88rem, 1.125rem);
  --font-size-meta: clamp(0.75rem, 0.2vw + 0.7rem, 0.8125rem);

  /* Geometry & Radius Constraints */
  --radius-sharp: 0px;            /* Strictly 0px or 2px max for academic restraint */
}
```

### 3. Archetype A Hero Ledger Specification
The right-hand 35% pane in the Hero section MUST be rendered as an **"Institutional Prospectus Ledger"** using `<dl class="hero-ledger">`:
- **Ledger Header:** `INSTITUTIONAL CREDENTIALS & ACADEMIC STANDING`
- **Mandatory Row 1:** Statutory Accreditation (e.g., WAEC, Cambridge Assessment, State Ministry of Education)
- **Mandatory Row 2:** Faculty-to-Student Ratio & Max Class Size
- **Mandatory Row 3:** Foundation Year & Regulatory Licensure ID
- **Mandatory Row 4:** Campus Security Status & Boarding Capacity
- **Mandatory Row 5:** Active Admissions Window & Verification Status

---

## ARCHETYPE B: "SWISS INDUSTRIAL & COMMERCIAL PRECISION"

### Intended Audiences
Industrial Contractors, Civil Engineering, Fabrication, B2B Logistics, HVAC & MEP Firms, Commercial Real Estate Development, Energy Systems, Infrastructure Software.

### Visual Vibe
Dieter Rams' Braun documentation meets Müller-Brockmann architectural grids. Highly structured, objective, machined, high-contrast, zero fluff.

### 1. Google Fonts `<head>` Embed
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
```

### 2. CSS Custom Properties (:root)
```css
:root {
  /* Surface Tokens (Architectural Concrete & Carbon Steel) */
  --bg-primary: #F4F4F0;          /* Raw Architectural Concrete */
  --bg-surface: #EAEAE4;          /* Secondary cell fill */
  --bg-surface-hover: #DFDFD8;    /* Mechanical interactive hover */
  --bg-ink: #111315;              /* Carbon Steel Dark Section */
  --bg-ink-surface: #1B1E22;      /* Elevated surface in dark section */

  /* Text & Contrast Tokens (High Clarity Technical Copy) */
  --text-primary: #111315;        /* Stark Carbon */
  --text-secondary: #45494D;      /* Machined Slate */
  --text-muted: #74787E;          /* Specification indices and units */
  --text-inverted: #F4F4F0;       /* High-contrast light text */
  --text-inverted-muted: #9BA0A8; /* Secondary captions on --bg-ink */

  /* Brand & Signal Tokens */
  --accent-primary: #D9381E;      /* International Signal Orange (Override with Client Logo Hex) */
  --accent-primary-hover: #B82C15;/* Signal active state */
  --accent-soft: #FDE8E4;         /* Status tint */

  /* Structural Rules & Borders */
  --border-hairline: #D0D0C8;     /* 1px Blueprint Grid Line */
  --border-strong: #111315;       /* Heavy structural delimiting rule */
  --border-inverted: #292D32;     /* Blueprint grid line on carbon surfaces */

  /* Typographic Stacks */
  --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', 'SF Mono', Consolas, monospace;

  /* Fluid Typographic Scales */
  --font-size-hero: clamp(2.5rem, 5.2vw + 1rem, 4.75rem);
  --font-size-h2: clamp(1.85rem, 3.2vw + 0.5rem, 3rem);
  --font-size-h3: clamp(1.25rem, 1.6vw + 0.3rem, 1.75rem);
  --font-size-body: clamp(0.95rem, 0.35vw + 0.85rem, 1.0625rem);
  --font-size-meta: clamp(0.72rem, 0.2vw + 0.68rem, 0.775rem);

  /* Geometry & Radius Constraints */
  --radius-sharp: 0px;            /* Strictly 90-degree corners */
}
```

### 3. Archetype B Hero Ledger Specification
The right-hand 35% pane in the Hero section MUST be rendered as an **"Operational Capability & Dispatch Ledger"** using `<dl class="hero-ledger">`:
- **Ledger Header:** `OPERATIONAL SPECIFICATION & DISPATCH LEDGER`
- **Mandatory Row 1:** Operational Coverage & Dispatch Base
- **Mandatory Row 2:** Turnaround SLA & Emergency Mobilization Window
- **Mandatory Row 3:** Compliance Standard & Industry Certification ID (e.g., ISO / COREN / OSHA)
- **Mandatory Row 4:** Fleet, Equipment, or Fabrication Capacity Spec
- **Mandatory Row 5:** Verified Direct Dispatch Hotline / Signal Channel
