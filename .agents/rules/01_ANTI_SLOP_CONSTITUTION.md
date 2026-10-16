# 01_ANTI_SLOP_CONSTITUTION: DETERMINISTIC UI & COPY LINTER
**Role:** Strictly enforced architectural constraints for production web interfaces. Violation of any rule below is an immediate review failure.

---

## 1. HARD BANS (VISUAL & STRUCTURAL)

1. **NO EMOJIS OR UNICODE DECORATIONS:**
   - Strictly zero Unicode emojis (`U+1F600`–`U+1F6FF`), sparkles (`✦`, `✨`), rockets, or decorative arrows (`→`, `➔`) inside headings, buttons, badges, or list items.
   - For navigational cues, use clean SVG icons with deterministic `width`, `height`, and `stroke-width: 1.5px` or semantic ASCII (`->` in monospace code tags only).

2. **NO PILL BADGES:**
   - `border-radius: 9999px` (or Tailwind `rounded-full`) above headings or in hero sections is strictly prohibited.
   - All category/eyebrow labels must sit flush-left on the baseline using:
     ```css
     font-family: var(--font-mono);
     font-size: 0.75rem;
     text-transform: uppercase;
     letter-spacing: 0.08em;
     color: var(--text-muted);
     ```

3. **NO ICON-IN-CIRCLE CARDS:**
   - Never generate a 3-column feature grid where each card features an icon nested in a rounded colored circle or pastel square above a generic heading.
   - Features must be rendered as **Tabular Ruled Ledgers** (`<ol>` with monotonic indexing `01`, `02`, `03`) or **Asymmetrical Bento Grids** using border bleed.

4. **NO FLOATING DROP SHADOWS:**
   - Ban diffuse multi-layer shadows (`box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1)`).
   - Depth and separation must be achieved exclusively through:
     - `1px solid var(--border-hairline)` structural borders.
     - Discrete surface shifts (`var(--bg-primary)` vs `var(--bg-surface)` vs `var(--bg-ink)`).
     - Typographic scale and weight contrast.

5. **NO CENTERED HERO STACKS:**
   - Never center-align the hero `<h1>`, descriptive body paragraph, and dual CTA buttons in a single vertical column.
   - All hero sections must implement an asymmetric multi-column architecture (e.g., a 65% Proposition / 35% Ledger split).

---

## 2. HARD BANS (COPYWRITING & EDITORIAL)

1. **EM-DASH BAN:**
   - The em-dash character (`—`) and en-dash (`–`) as conversational punctuation are banned across all HTML text nodes.
   - Enforce syntactical clarity using periods, colons, semicolons, or parenthetical qualifiers.

2. **BANNED AI VOCABULARY:**
   - Never emit the following generic marketing fillers:
     *Elevate, Seamless, Unleash, Cutting-edge, Tailored, Empower, Revolutionize, Next-gen, Testament, Delve, Comprehensive, Beacon, Fostering, Supercharge, Holistic, Synergistic, Unparalleled.*
   - If a verb or adjective does not describe a physical, legal, or mathematically verifiable action, discard it.

3. **CONCRETE SPECIFICITY MANDATE:**
   - Every claim must state an operational mechanism, quantitative metric, regulatory credential, or physical specification.
   - *Prohibited:* "We provide premier, transformative educational excellence."
   - *Mandatory:* "98.4% WAEC/WASSCE distinction rate across 14 fully equipped STEM, robotics, and language laboratories."

---

## 3. SEMANTIC ARCHITECTURE & ACCESSIBILITY (A11Y)

1. **NO DIV-SOUP LEDGERS:**
   - Key-value specifications and right-pane ledgers MUST be marked up semantically using Definition Lists (`<dl>`, `<dt>`, `<dd>`) or ordered tables (`<table>`, `<thead>`, `<tbody>`).
   - Every metric or status badge must be screen-reader accessible with appropriate `aria-label` and `role` attributes.

2. **DETERMINISTIC FORM & INTERACTION STATES:**
   - Every interactive element (`<button>`, `<a>`, `<input>`) must have:
     - Explicit `:focus-visible` styles (`outline: 2px solid var(--accent-primary); outline-offset: 2px`).
     - Distinct `:hover` and `:active` state transitions without layout shifts (`transform` or `background-color` transitions only).
     - Explicit disabled state handling (`aria-disabled="true"`, `cursor: not-allowed`, muted opacity).

---

## 4. RESPONSIVE COLLAPSE & SUBPIXEL RENDERING GUARANTEES

1. **NO HORIZONTAL OVERFLOW:**
   - `overflow-x: hidden` applied to `<body>` or `<html>` is a symptom patch and is strictly prohibited as a layout fix.
   - All grid tracks and flex children must define `min-width: 0` to prevent wide text strings and flex children from blowing out the viewport.

2. **DETERMINISTIC BREAKPOINT COLLAPSE (`@media (max-width: 768px)`):**
   - **Hero Asymmetric Grid (`65fr 35fr`):** Collapses to single column (`1fr`). The 35% Ledger stacks directly beneath the primary CTA cluster with `margin-top: 2rem`.
   - **Pattern A (Horizontal Ruled Ledger):** Converts from `grid-template-columns: 4rem 1.8fr 1.2fr auto` to a stacked card/block layout with `padding: 1.5rem 0`, maintaining the hairline border separation.
   - **Pattern B (Asymmetric 6-Column Bento):** Every child spanning `span 2`, `span 3`, or `span 4` must collapse to `grid-column: span 6` (or `1 / -1`) on mobile screens.

3. **SUBPIXEL BORDER-BLEED DEFENSE:**
   - When constructing hairline borders via parent background bleed (`background-color: var(--border-hairline)` with `gap: 1px`), child elements must declare `background-clip: padding-box` and `box-sizing: border-box`.
   - On display viewports with decimal device-pixel ratios (e.g., 1.25x or 1.5x Windows scaling), supply a media query fallback:
     ```css
     @media (-webkit-min-device-pixel-ratio: 1.25), (min-resolution: 120dpi) {
       .hairline-grid {
         background-color: transparent;
         gap: 0;
       }
       .hairline-grid > * {
         border: 1px solid var(--border-hairline);
         margin-bottom: -1px;
         margin-right: -1px;
       }
     }
     ```

4. **FLUID TYPOGRAPHY & SPACING:**
   - All section headers and key type scales must use mathematical W3C `clamp()` formulas:
     ```css
     --font-size-hero: clamp(2.5rem, 5vw + 1rem, 4.75rem);
     --font-size-h2: clamp(1.85rem, 3.2vw + 0.5rem, 3rem);
     --font-size-body: clamp(1rem, 0.4vw + 0.9rem, 1.125rem);
     --space-section: clamp(4rem, 8vw, 8rem);
     --space-cell: clamp(1.25rem, 3vw, 2.5rem);
     ```

---

## 5. MANDATORY SECTION CADENCE (SECTION RHYTHM)

Never stack consecutive sections with identical visual weights. Every production landing page must follow this alternating cadence:

```
[ Section 01: Hero ]          Asymmetric 65/35 Split Ledger (Brand Canvas: --bg-primary)
      ↓
[ Section 02: Capabilities ]  Pattern A (Ruled Horizontal Ledger) OR Pattern B (6-Col Border-Bleed Bento)
      ↓
[ Section 03: Proof/SLA ]     High-Contrast Dark Inversion (--bg-ink / --text-inverted / Tabular Metrics)
      ↓
[ Section 04: Narrative/Team] Asymmetric Text Block (55ch max reading width) + Structured Detail Ledger
      ↓
[ Section 05: Conversion ]    Split Dispatch: Direct Coordinates & Hours (Left) + Deterministic Form (Right)
```
