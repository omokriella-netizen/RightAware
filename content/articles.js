/* RightAware articles, write-ups & law-related resources (v1).

   Editing rules (same discipline as content/rights.js):
   - This file is the single source for the Articles section on the Resources page.
   - No invented laws, cases, agencies, statistics or sources. Every entry must
     point at material that already exists on the platform or at a supplied document.
   - `source` is mandatory and must be truthful; `url` must resolve to a real page.
   - `date` is the publication date of the piece itself (YYYY-MM-DD).
   - `category` drives the label; keep the vocabulary small and consistent.
   - When the admin dashboard gains article publishing (spec §21 / stage C+E),
     the database becomes the source of truth and this file becomes the fallback
     seed only. Do not maintain two conflicting versions. */

window.RA_ARTICLES = [
  {
    id: "verify-a-law",
    title: "How to verify any law before you rely on it",
    category: "Method",
    date: "2026-09-30",
    author: "RightAware editorial",
    source: "RightAware laws library",
    summary: "Before you quote a law, check its source, its year and whether it is still in force. Read the original document in our laws library, then confirm the exact wording for your situation with a qualified practitioner.",
    url: "laws.html"
  },
  {
    id: "chapter-iv",
    title: "Chapter IV at a glance: the rights the Constitution sets out",
    category: "Civic explainer",
    date: "2026-09-30",
    author: "RightAware editorial",
    source: "Supplied 1999 Constitution (PDF) + RightAware rights overview",
    summary: "Life, dignity, liberty, fair hearing, expression, assembly, movement and non-discrimination — explained in plain language from the supplied text. Always verify the exact wording against the official gazetted version.",
    url: "rights/topic.html?id=fundamental"
  },
  {
    id: "keep-the-evidence",
    title: "Keep the evidence: what to save when something goes wrong",
    category: "Practical guide",
    date: "2026-09-30",
    author: "RightAware editorial",
    source: "RightAware printable guides",
    summary: "Receipts, messages, dates, photos, names and notices — kept in one place make any complaint or claim easier to prove. Print the checklists, keep copies, and record who you spoke to and when.",
    url: "printables.html"
  }
];
