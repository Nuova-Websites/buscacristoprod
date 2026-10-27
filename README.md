# Busca Cristo

Static site for the Barcelona Mission outreach. Pages are generated from templates.

## Editing

- **Edit `src/`, not the root `.html` files.** The root pages are generated and get overwritten.
  - `src/pages/**` — page content (mirrors the site layout; front matter sets `title`, `description`, etc.)
  - `src/partials/` — shared nav, footer and social icons
  - `src/layouts/base.html` — `<head>` and page skeleton
  - `src/site.json` — site-wide values, including the social media URLs
- Styles: `css/styles.css`. Scripts: `js/site.js` (all pages), `js/home.js` (home page only).

## Build

```bash
npm run build
```

Writes the generated pages next to `src/` (same paths as before), so hosting is unchanged. Commit the generated files too.
