/* RightAware Video library catalog (v2).
   HONESTY RULE: no real videos are claimed. v2 ships EMPTY (no invented videos).
   Add entries following this schema when videos are supplied.
   Schema: id, title, description, category, duration, url (embed/file URL or ""),
   thumb (thumbnail path or ""), featured (bool), relatedRights [ids],
   lang, status ("published"|"draft"), verification {status, source, date}. */
window.RA_VIDEOS_LIB = [];
window.RA_VIDEO_CATEGORIES = ["Police & Arrest","Housing","Employment","Civic Duty","Family & Safety","Consumer","Digital Safety","Children","Education"];
/* How to add a video (also see CONTENT_UPLOAD_GUIDE.md):
   1. Upload the file/thumbnail via the future storage (Supabase Storage bucket "videos").
   2. Add an entry above with status "draft" until reviewed, then "published".
   3. Optionally set featured:true to show it on Home and Videos pages. */
