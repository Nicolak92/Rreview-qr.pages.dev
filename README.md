# Toolzweb

Free online tools site at https://toolzweb.com. Hosted as a Cloudflare Worker with static assets, deployed from this GitHub repo.

## How it is organised
- `tools.json`  the list of the site, categories and every tool (live or coming soon). The menus, category pages and sitemap are built from this.
- `tools/<slug>.html`  one file per live tool: its CSS, the tool itself, the guide text, the FAQ and its scripts.
- `pages/*.html`  About, Privacy, Affiliate disclosure, Contact.
- `assets/`  shared CSS, the menu script and the favicon.
- `build.mjs`  builds the whole site into `public/`.
- `src/index.js`  the Worker: redirects (www, old addresses), the Google Maps short-link expander at /api/resolve, then the site.
- `wrangler.jsonc`  Cloudflare settings (the name must match the Cloudflare project).
- `public/`  the finished site (built). Do not edit by hand.

## Add a new tool (3 steps)
1. Create `tools/<slug>.html` (copy an existing one). Keep the 5 markers: `<!--CSS-->`, `<!--MARKUP-->`, `<!--GUIDE-->`, `<!--FAQ-->`, `<!--TAIL-->`.
2. In `tools.json`, find the tool's entry and change `"status": "soon"` to `"live"`. Add `"kit": "<form id>"`, an `"seo"` block (title, description, h1, lead), `"affiliate": {"items": []}` and `"related": []`, like the live tools.
3. Commit. Cloudflare rebuilds. The tool appears in every menu, its category page and the sitemap.

## Email form per tool
Each live tool has its own `"kit"` value: the Kit form id (the data-uid in Kit's embed code). Use one Kit form per tool so you can see where each subscriber came from.

## Affiliate banner per tool
In the tool's entry in `tools.json`, add items to `"affiliate": {"items": [...]}`:
`{"title": "Product name", "text": "One line why it helps", "button": "Try it", "url": "https://your-tracked-link", "image": "optional image url"}`
Use a different tracking tag in each tool's link. For a banner code, use `"html": "<a ...>...</a>"` instead. The section stays hidden while empty and includes the affiliate disclosure line.

## Cloudflare build command
In Cloudflare: Workers & Pages > your project > Settings > Build > Build command: `node build.mjs`.
Until that is set, the committed `public/` folder is what gets published.

## Settings in tools.json "site"
`url`, `name`, `blogUrl`, `kitHost`, `analyticsToken` (Cloudflare Web Analytics token), `googleVerification`, `contactEmail`.
