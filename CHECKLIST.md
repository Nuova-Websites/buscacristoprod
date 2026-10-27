# Busca Cristo — Improvement Checklist

22 items (item 21 bundles three small accessibility fixes).

## Critical (broken now)
- [x] 1. Wire the contact form to a real backend (`API_URL` in `index.html` is still a placeholder, so leads are lost)
- [x] 2. Add a consent checkbox to the form
- [x] 3. Add a privacy page (GDPR)
- [x] 4. Disclose or replace the geolocation lookup, which sends coordinates to Nominatim
- [ ] 5. Make the language picker work (real translations), or remove it
- [ ] 6. Fix the Facebook, Instagram and YouTube links (`href="#"`)

## Repo hygiene
- [x] 7. Delete `.tmp.driveupload/` (41 junk files)
- [x] 8. Add a `.gitignore`

## Performance
- [x] 9. Compress the 18 MB hero video to about 2–3 MB, or skip it on mobile
- [x] 10. Show the poster or fallback image immediately instead of after a 2 s timeout
- [x] 11. Self-host the 91 hotlinked `churchofjesuschrist.org` images and convert them to webp
- [x] 12. Add `loading="lazy"` to images

## SEO and sharing
- [ ] 13. Add meta descriptions to the 22 pages that lack one
- [ ] 14. Add Open Graph tags
- [ ] 15. Add a favicon
- [ ] 16. Add `sitemap.xml`
- [ ] 17. Add `robots.txt`

## Code quality
- [x] 18. Remove the inline CSS and JS duplicated in `index.html` and use `css/styles.css`
- [x] 19. Move the nav, footer and script into a template (Eleventy or Astro) instead of 23 copies
- [x] 20. Replace the scattered inline `style=` attributes

## Accessibility and QA
- [x] 21. Add `aria-expanded` to the mobile menu, add `prefers-reduced-motion` handling, and check nav contrast over the hero
- [ ] 22. Test in a browser: mobile menu, carousels, and links on all pages
