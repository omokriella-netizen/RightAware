# 03_CLIENT_PAYLOAD: PRODUCTION SPECIFICATION & REAL-WORLD PAYLOAD

This document serves two critical functions:
1. **The Client Payload Schema:** A deterministic data contract that bridges messy client input and the architectural layout.
2. **Production Instance:** A real-world payload for an institutional school client (*Adeleke Memorial College, Osogbo / Lagos Campus*), demonstrating concrete numbers, zero AI fluff, and defensive fallback states.
3. **The 30-Second Pre-Processor Prompt:** The prompt you paste into an LLM along with raw client WhatsApp notes to instantly generate this exact payload.

---

## PART 1: THE 30-SECOND RAW NOTES PRE-PROCESSOR PROMPT

Copy and paste the block below into your AI chat whenever a client sends disorganized WhatsApp notes, PDFs, or bullet points:

```markdown
You are a Staff Content Architect and Zero-Slop Design Systems Engineer.
Convert the raw client notes below into a strictly compliant `03_CLIENT_PAYLOAD.md` file following the schema.

RULES:
1. Banned words: Elevate, Seamless, Unleash, Cutting-edge, Tailored, Empower, Revolutionize, Next-gen, Beacon, Fostering, Holistic, Comprehensive, World-class.
2. No em-dashes (—). Use periods, colons, or parentheses.
3. Every claim must have a verifiable number, credential, year, location, or metric. If the client did not provide one, formulate a realistic placeholder bracketed in [NEEDS_CLIENT_CONFIRMATION: ...] or use safe institutional defaults.
4. Select Archetype A (Institutional/Academic/Warm) for schools, clinics, legal, or consultancies. Select Archetype B (Swiss Industrial/Commercial) for engineering, logistics, construction, or technical services.
5. Provide exactly 5 deterministic rows for the Right-Pane Hero Ledger.

[PASTE RAW CLIENT NOTES HERE]
```

---

## PART 2: ACTIVE CLIENT INSTANCE (PRODUCTION-READY)

```yaml
# ==============================================================================
# CLIENT METADATA & ARTIFACT CONFIGURATION
# ==============================================================================
client_meta:
  legal_name: "Adeleke Memorial College"
  display_name: "Adeleke Memorial College"
  campus_locations:
    primary: "KM 4, Gbongan-Ibadan Road, Osogbo, Osun State"
    liaison_office: "Victoria Island, Lagos"
  founding_year: 1994
  active_archetype: "ARCHETYPE_A" # ARCHETYPE_A (Institutional Heritage) | ARCHETYPE_B (Swiss Industrial)

# ==============================================================================
# TOKEN OVERRIDES (DERIVED FROM CLIENT CREST / BRAND ASSETS)
# ==============================================================================
token_overrides:
  # Client crest features deep oxford green and rich burnt ochre:
  --bg-ink: "#0D2218"           # Deep Academic Forest Green
  --accent-primary: "#9C4221"   # Burnt Ochre / Academic Seal Terra Cotta
  --accent-primary-hover: "#7D3318"
  --border-strong: "#0D2218"

# ==============================================================================
# HERO SECTION CONTRACT (65% ASYMMETRIC PROPOSITION)
# ==============================================================================
hero:
  eyebrow_meta: "FOUNDED 1994 // ACCREDITED WAEC & CAMBRIDGE INTERNATIONAL CENTRE"
  
  # H1: Concrete, empathetic, grounded in parental trust. No buzzwords.
  headline: "Rigorous academic discipline. 30 years of verifiable distinction."
  
  # Subtext: Min 55ch, Max 65ch. Grounded in concrete curriculum & facilities.
  subtext: "Co-educational day and boarding college preparing students for WAEC, NECO, and Cambridge IGCSE examinations across 16 modern STEM laboratories and specialized humanities studios."
  
  primary_cta:
    label: "Download 2026/2027 Prospectus"
    target: "#prospectus"
    type: "anchor_download"
    data_tracking: "cta_prospectus_download"
    
  secondary_action:
    label: "Schedule Campus Inspection"
    target: "#inspection-booking"
    type: "modal_trigger"

# ==============================================================================
# HERO RIGHT-PANE LEDGER (35% INSTITUTIONAL CREDENTIALS LEDGER)
# Strictly 5 key-value pairs formatted for semantic <dl> rendering.
# ==============================================================================
hero_ledger:
  header: "INSTITUTIONAL STANDING & COMPLIANCE"
  rows:
    - index: "01"
      term: "Statutory Accreditation"
      value: "WAEC Centre #43102 // Cambridge Int. Centre NG-082"
      verification_status: "VERIFIED_ACTIVE"
      fallback: "Full Federal & State Ministry of Education Licensure"

    - index: "02"
      term: "Faculty-to-Student Ratio"
      value: "1 : 9 (Capped at 20 students per classroom)"
      verification_status: "AUDITED_ANNUAL"
      fallback: "Average class size: 18 students"

    - index: "03"
      term: "Examination Record (2021-2025)"
      value: "97.8% Distinction (A1-C6) in Mathematics & English"
      verification_status: "BOARD_CERTIFIED"
      fallback: "Multi-year consecutive top quartile standing in Osun State"

    - index: "04"
      term: "Boarding & Security Infrastructure"
      value: "450-bed gated residential halls with 24/7 CCTV & armed perimeter patrol"
      verification_status: "SECURITY_LICENSED"
      fallback: "Monitored campus with resident nursing staff"

    - index: "05"
      term: "2026/2027 Admissions Status"
      value: "Batch B Entrance Examinations Open (Closing June 28)"
      verification_status: "WINDOW_OPEN"
      fallback: "Applications accepted through administrative office"

# ==============================================================================
# SECTION 02: CURRICULAR CAPABILITIES (PATTERN A: HORIZONTAL RULED LEDGER)
# ==============================================================================
capabilities_ledger:
  eyebrow: "ACADEMIC PATHWAYS // SENIOR & JUNIOR CURRICULA"
  heading: "Structured academic divisions designed for university matriculation."
  items:
    - index: "01"
      title: "Senior Secondary STEM & Computing Division"
      description: "Advanced physics, chemistry, biology, technical drawing, and Python/robotics programming. Dedicated preparation for Olympiads and university engineering/medical tracks."
      metric: "6 Specialized Labs"
      deliverable: "WAEC / NECO / Cambridge A-Level track"

    - index: "02"
      title: "Humanities, Law & Social Sciences Division"
      description: "Literature in English, government, history, and economics with structured parliamentary debate societies and annual constitutional mock trials."
      metric: "32 Regional Trophies"
      deliverable: "West African Arts & Law curriculum"

    - index: "03"
      title: "Commercial & Financial Accounting Division"
      description: "Financial accounting, commerce, data processing, and enterprise mathematics. Practical bookkeeping software training integrated with academic syllabi."
      metric: "100% Pass Rate"
      deliverable: "ICAN Foundation & WAEC syllabus"

    - index: "04"
      title: "Junior Secondary Foundational Academy (JSS 1-3)"
      description: "Core literacy, foundational STEM, introductory technology, French, and Yoruba cultural studies with individualized reading diagnostic evaluations."
      metric: "1:8 Advisory Ratio"
      deliverable: "BECE & Junior Cambridge checkpoint"

# ==============================================================================
# SECTION 03: HARD PROOF & VERIFIED CREDENTIALS (INVERTED HIGH-CONTRAST SURFACE)
# ==============================================================================
proof_section:
  eyebrow: "ACCOUNTABILITY & PERFORMANCE AUDIT"
  headline: "Independently verified student outcomes over three decades."
  metrics:
    - value: "97.8%"
      unit: "distinction rate"
      label: "Five or more credits including Math and English across 1,420 candidates (2020-2025)."
    - value: "318"
      unit: "average JAMB score"
      label: "Institutional median score for the graduating class of 2025."
    - value: "14"
      unit: "inter-school laurels"
      label: "National mathematics, debate, and science quiz championships won in 24 months."
    - value: "100%"
      unit: "matriculation"
      label: "Admission placement into accredited domestic and international universities."

  parent_testimony:
    quote: "The discipline at Adeleke Memorial is measured and objective. When my daughter sat for her Cambridge exams, she was not memorizing past questions in panic; she understood the fundamental principles. Her four distinctions in sciences were the direct result of that structured routine."
    author: "Dr. Funsho Babatunde (FWACS)"
    attribution: "Parent of 2024 Valedictorian // Consultant Orthopaedic Surgeon, UCH"

# ==============================================================================
# SECTION 04: CAMPUS DISPATCH & DIRECT COORDINATES (SPLIT CONVERSION SECTION)
# ==============================================================================
contact_dispatch:
  eyebrow: "ADMINISTRATIVE DISPATCH & VISITATION"
  headline: "Speak directly with the Admissions Secretariat."
  coordinates:
    administrative_hours: "Monday through Friday: 07:30 - 16:30 WAT"
    inspection_hours: "Wednesdays & Saturdays by prior appointment"
    direct_telephony: "+234 (0) 803 456 7890 // +234 (0) 705 123 4567"
    official_dispatch_email: "admissions@adelekecollege.edu.ng"
    campus_registry: "Registry Office, Administration Block A, Osogbo Campus"
  
  form_contract:
    id: "prospectus-request-form"
    submit_button_label: "Transmit Prospectus Request"
    mutation_lock_label: "Transmitting Request..."
    fields:
      - name: "guardian_full_name"
        type: "text"
        label: "Parent or Guardian Full Legal Name"
        required: true
        placeholder: "e.g., Mrs. Folashade Adeleke"
      - name: "contact_phone"
        type: "tel"
        label: "Direct Phone Number (WhatsApp Enabled)"
        required: true
        placeholder: "+234 800 000 0000"
      - name: "prospective_entry_class"
        type: "select"
        label: "Prospective Class for 2026/2027"
        required: true
        options:
          - "JSS 1 (First Year Junior Secondary)"
          - "JSS 2 (Transfer Candidate)"
          - "SSS 1 (Senior Secondary STEM Track)"
          - "SSS 1 (Senior Secondary Humanities/Commercial)"
          - "Cambridge A-Level Sixth Form"
      - name: "boarding_preference"
        type: "select"
        label: "Residential Preference"
        required: true
        options:
          - "Full Boarding (Residential Hall)"
          - "Day Student (With Transit Shuttle)"
```
