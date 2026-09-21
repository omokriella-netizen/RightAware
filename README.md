# RightAware

**RightAware** is a Nigerian Civil Tech and Legal Awareness Platform. Its goal is to help
citizens understand their rights, civic responsibilities, and the laws that protect them —
in simple, clear language.

> **Motto:** Understand your Rights. Know your power.

## Purpose

Millions of Nigerians face police stops, evictions, dismissals, scams, and other legal
situations without knowing the protections and duties the law already gives them.
RightAware turns legal knowledge into plain, usable power — free for everyone,
regardless of income, location, or schooling.

**Vision:** A Nigeria where every person can understand the law well enough to act on it.

**Mission:** Publish free, plain-language rights guides, connect people to real help, and
build trustworthy civic-tech tools with verified sources.

## What the website provides

- **Home page** — branding, hero message, Get Started / Explore Rights calls to action,
  global search, popular rights topics, featured resources, educational videos,
  legal-help triage, support organisations, and professionals preview.
- **About Us** — purpose, vision, mission, and what RightAware is (and is not).
- **Explore Rights** — a searchable library of 12 categories: Fundamental Human Rights,
  Police & Arrest Rights, Employment Rights, Rent & Tenancy Rights, Consumer Rights,
  Women's Rights, Children's Rights, Disability Rights, Education Rights,
  Digital/Online Rights, Constitutional Rights, and Civic Responsibilities.
  Includes one complete guide (**Police & Arrest Rights**); other topics open as
  structured overviews with source hints while full guides are researched.
- **Resources** — Constitution guide, rights guides, educational videos, FAQs,
  rights-protection organisations, helpful official-source links, and printable
  checklists (Print → Save as PDF).
- **Get Help** — help paths, professionals preview, organisation types, emergency
  guidance, and a report-a-concern form that structures a complaint summary.
- **Legal Professionals** — a filterable directory interface (name, practice area,
  location, profile, rating, client reviews, request-help). **v1 uses clearly marked
  fictional DEMO data — not real lawyers.**
- **RightAware AI (demo)** — a clearly marked placeholder assistant that points users
  to library pages. Not connected to a live AI or legal service.
- **Contact Us** — placeholder contact details plus a working demo contact form.
- **Search** — site-wide search across rights, guides, videos, FAQs, and pages.

## Design

Modern, professional, and trustworthy civic-tech look and feel: clean typography,
responsive layout (phone, tablet, desktop), consistent header/footer on every page,
light scroll animations (with `prefers-reduced-motion` support), and keyboard-focus
accessibility styles.

## How to run

No build step and no backend. The site is static HTML/CSS/JS.

1. Clone or download this repository.
2. Open `index.html` in any modern browser (double-click it),
   or serve the folder locally, e.g. `python -m http.server` and visit
   `http://localhost:8000`.

## Project structure

```text
RightAware-official/
├── index.html            # Home page
├── about.html            # About Us
├── rights.html           # Rights library (12 categories)
├── rights/
│   ├── arrest-rights.html# Full Police & Arrest Rights guide
│   └── topic.html        # Generic overview renderer (?id=...)
├── resources.html        # Guides, videos, FAQs, organisations, links, print
├── help.html             # Get Help + report-a-concern
├── lawyers.html          # Professionals directory (DEMO data)
├── ai.html               # RightAware AI demo placeholder
├── search.html           # Site-wide search
├── contact.html          # Contact page (placeholder details)
├── login.html            # Demo login
├── data.js               # Shared content index (rights, videos, FAQs, directory)
├── app.js                # Shared UI (nav, search, newsletter, animations)
├── styles.css            # Site-wide stylesheet
└── script.js             # Legacy homepage script (kept for reference)
```

## Important notes

- Content is **general legal information only — not legal advice**. Laws differ by
  state and change over time.
- Items marked **VERIFY / DEMO / PLACEHOLDER** still need confirmation against
  official sources before final publication: real contact details, emergency numbers,
  lawyer verification, AI backend, video production, and full guides for 11 topics.
- No real lawyers, phone numbers, addresses, or client data are included in v1.

## Status

v1 — first complete working version (static front end, demo data where marked).
