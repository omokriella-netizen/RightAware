# RightAware CONTENT_UPLOAD_GUIDE.md — how to add/edit everything

All content is plain files you can edit in any text editor. Save, reload the page.
Status labels must stay honest: `verified` / `draft|partial` / `overview` /
`awaiting-upload|awaiting-verification` / `demo` / `placeholder`.

## Rights → `content/rights.js`
Copy any entry, change `id` (lowercase, unique), fill every field:
`icon, title, summary, status, explanation[], legalBasis{text,status},
meaning[], canDo[], avoid[], examples[{t,d}], faqs[{q,a}], related[id…],
orgs[type names…], sources[], keywords`.
- `status:"overview"` until a lawyer reviews it; `"partial"` for good drafts.
- Never invent section numbers, cases or statistics — use VERIFY hints.
- The library (`rights.html`), search and topic pages pick it up automatically.

## Laws → `content/laws.js`
Add catalog entries with `status:"awaiting-upload"`, `fileRef:null` until the
verified file is in storage (`legal-docs` bucket). Fill `sourceHint, yearNote,
relatedRights[]`, then set `verification{status:"verified",source,date}`.
Categories: see `RA_LAW_CATEGORIES`.

## Videos → `content/videos.js`
Add `{id,title,description,category,duration,url|video_path,thumb,featured,
relatedRights[],lang,status:"draft"}`. Ship as `draft` until reviewed, then
`"published"`. Featured items surface on Home + Videos automatically.

## Organizations → `content/organizations.js`
- Types (`RA_ORG_TYPES`) describe *kinds* of help — safe to extend.
- Full records (`RA_ORGANIZATIONS`) publish **only** with
  `verification.status:"verified"` + official `source`. No contacts before that.

## Professionals → `content/professionals.js` (demo) → admin onboarding (live)
- Demo records must keep `isDemo:true` and fictional names.
- Real onboarding (post-backend): application → credential check → record with
  `verification{status:"verified",source,date}` → public listing. Never convert a
  demo record into a real person; create a new record.

## FAQs / resources / home sections
- FAQs: `RA_FAQS` in `data.js`. Videos teaser on Home: `RA_VIDEOS` in `data.js`.
- Rights categories live in **one file**: `content/rights.js` (`RA_RIGHTS_DETAIL`).
  `RA_RIGHTS` is derived from it at load — do not define it anywhere else.
  Add one entry there and it automatically appears in the Rights Library grid, the
  Resources guides list, site search and the homepage/hero counts (`data-rights-count`).
- Featured rights on Home: first 6 of `RA_RIGHTS`. Headline categories are listed first
  in `RA_RIGHTS_PRIMARY` (same file) — edit that array to reorder.

## Images & files
- Thumbnails/logos/photos: place under `assets/` (create it) and reference by
  relative path (e.g. `assets/thumbs/arrest.jpg`). Never hot-link files you do
  not own. After Supabase setup, move uploads to Storage buckets (DATABASE.md)
  and put the public URLs in the same fields.

## Review checklist before publishing anything
- [ ] Facts checked against an official source (cite it in `sources`)
- [ ] Status label correct; no `verified` without a source + date
- [ ] No real names, contacts, numbers or addresses unless verified
- [ ] Disclaimer present (templates already include it)

## Laws library & text indexes (this build)
The laws library ships 11 real PDFs in `assets/legal/` with per-page text indexes
in `content/law-text/*.js`. To add or update a document:

1. Drop the PDF in `assets/legal/` and add/adjust its entry in `content/laws.js`
   (`id`, `title`, `file`, `textFile`, `pages`, `textAvailable`, verification note).
2. Produce the text index `content/law-text/<name>.js` with the PdfPig extraction
   helper (PowerShell + `Add-Type`, no Python/Node needed) writing
   `window.RA_LAW_TEXT["<id>"] = { pageCount, emptyPages, chars, pages:[…] }`.
3. **The registry key inside the text file MUST equal the `laws.js` `id`**
   (e.g. id `constitution-1999` → key `constitution-1999`). If they differ the
   document loads but its text is silently skipped in search — this exact bug was
   found and fixed for 6 documents during QA; the id↔key pairs are checked in QA.
4. Scanned/image-only PDFs get `textFile: null, textAvailable: false`; the UI then
   shows the honest “scanned copy — open it in the viewer” message instead of
   pretending they are searchable.

## Pidgin translations (`content/i18n.js`)
- Every UI string is an `{ en, pcm }` pair where `en` must match the visible
  English text exactly (whitespace-insensitive).
- `pcm` values are **drafts**; the `status` block must stay `draft` until a
  qualified Nigerian Pidgin reviewer approves them.
- Never translate statutory wording, section numbers, or quotes from the supplied
  PDFs — translate only UI/labels/explanations you authored.
- Adding a language: add it to `meta.languages`, add that field to entries
  (missing entries fall back to English), and extend the selector normalizer.
