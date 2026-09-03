# eightsixit.com

Static marketing site for Eight Six IT Engineering, deployed on Cloudflare Pages
from the `main` branch. There is no server and no framework: the pages are plain
HTML, and everything they need is committed to the repository.

## Working on it

```
npm install       # once
npm run watch     # rebuild tailwind.css as you edit
npm run serve     # http://localhost:8080
```

### The one build step

Tailwind classes are compiled ahead of time into `tailwind.css`, which **is
committed** so that Cloudflare Pages can deploy the repository as-is, with no
build command configured.

That means: **after adding or changing any Tailwind class in an HTML file or in
a JavaScript string, run `npm run build` and commit the regenerated
`tailwind.css`.** If you skip it, the new class silently has no effect in
production. `tailwind.config.js` scans `./*.html` and `./*.js` for this reason —
class names that only ever appear in JS string literals are still picked up.

The site previously loaded the Tailwind Play CDN, which compiled CSS in the
visitor's browser on every page view. Do not put it back.

## Layout

| Path | What it is |
|---|---|
| `*.html` | One file per page. Header, footer and `<head>` metadata are duplicated by hand — keep them in sync. |
| `site.css` | Shared motion and interaction styles. |
| `site.js` | Shared behaviour: menu, counters, FAQ, scroll reveals, 2D particle fallback. |
| `experience.js` | The optional cinematic layer (GSAP, Lenis, Three.js). The site works without it. |
| `src/tailwind.css` | Build input. Edit this, never `tailwind.css`. |
| `fonts/`, `fonts.css` | Self-hosted Space Grotesk and a subset of Material Symbols. |
| `_headers` | Cloudflare Pages security and caching headers. |
| `sitemap.xml` | Update when adding or removing a page. |

## Conventions

- **Internal links use clean URLs** (`/about`, not `about.html`). Cloudflare
  redirects the `.html` form, so linking to it costs every visitor a round trip.
- **Cache busting** is the `?v=YYYYMMDD` query string on `site.css`, `site.js`,
  `experience.js`, `fonts.css` and `tailwind.css`. Bump it in all eight pages
  when you change one of those files.
- **Icons** are ligatures from a subset font holding only the ~90 glyphs in use.
  To add one, refetch the subset from Google Fonts with the extra name in the
  `icon_names` parameter and replace `fonts/material-symbols-subset.woff2`:

  ```
  https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=add,arrow_forward,...
  ```

  An icon whose glyph is missing from the subset renders as its literal name.
- **Icon `<span>`s are marked `aria-hidden` automatically** by `site.js`. A
  button or link whose only content is an icon therefore needs its own
  `aria-label`, or screen readers announce nothing.
- **Colour**: `primary` (`#1f3a89`) is for fills. On dark backgrounds it fails
  contrast as text, so use `primary-text` (`#8FA8F0`) there.

## Adding a page

Copy an existing page, then update: `<title>`, the meta description (keep it
under 155 characters), the canonical URL, the Open Graph and Twitter tags, the
active navigation link, `sitemap.xml`, and the footer links if it belongs there.
