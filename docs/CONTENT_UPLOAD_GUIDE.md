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
- Featured rights on Home: first 6 of `RA_RIGHTS` — reorder there to change.

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
