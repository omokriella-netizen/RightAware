/* RightAware blog manifest (static, repo-controlled, no build step).
   HOW TO PUBLISH A POST:
   1. Create blog/posts/<slug>.html using the site page skeleton (paths are one
      level up: ../styles.css, ../app.js, ../assets/...). Its <head> must carry
      <title>, meta description, canonical, og:title, og:description, og:url.
   2. Add an entry below with ALL required metadata:
        { slug, title, description, date: "YYYY-MM-DD", status: "PUBLISHED" }
      slug: lowercase letters, digits and hyphens only.
   3. Add the post to sitemap.xml as blog/posts/<slug>.html.
   DRAFTS ARE NEVER COMMITTED: unfinished posts must live outside git. Nothing
   under blog/ with a "draft" path may ever be tracked (enforced by check-blog).
   The public site can only ever contain entries whose status is exactly
   "PUBLISHED", and only a PUBLISHED entry may have a page under blog/posts/.
   No third-party embeds: posts are plain repository-authored HTML, never
   user-supplied markup. */
window.RA_BLOG_POSTS = [];
