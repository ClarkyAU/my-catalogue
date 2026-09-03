# Clarky3D — Site Blueprint

**Last verified against:** `25bf936` — 2026-09-03

A living map of how this site is built. It exists so a run does not have to
re-read the codebase to find out where something lives: start here, go straight
to the files named, and only widen the search if what you need genuinely is not
described below.

Anything stated here is a claim about the code, not a specification of it. If the
two disagree, the code wins — fix this file. The line above says when the claims
were last checked against the repository; the further the code has moved since,
the more sceptically you should read them.

### What this file does not cover

It is a map, not the territory. It tells you which file to open and what is odd
about it; it does not stand in for reading that file. Deliberately absent:

- Function signatures, prop shapes, and component internals.
- The validation and error handling inside `netlify/functions/admin.mts`, which
  is most of that file — §7 names the endpoints, not their request bodies.
- The CSS class inventory, layout rules, and breakpoints.
- Exact copy, defaults, and enum values that can be read straight off
  `server/settings.ts` or `db/schema.ts`.

Use this to skip the search, then read the files you are about to change.
Editing from the map alone is how a change goes wrong.

---

## 1. What the site is

A storefront for made-to-order 3D prints (print.clarkyau.com). Visitors browse a
three-level catalogue (category → sub-category → product), pick colours and
made-to-order options, and build a basket. **There is no checkout.** The basket
is turned into a written message and handed to Telegram as a deep link; the
actual order is placed in that chat. There are no customer accounts.

The owner ("Clarky") edits everything through a separate password-gated admin
portal at `/admin`: the catalogue, product photos, site copy, the watermark
treatment, the featured running order, and the filament colour library.

## 2. Stack and entry points

| Piece | Where |
| --- | --- |
| Build | Vite 8, React 19, plain JS + JSX on the frontend; TypeScript on the server side |
| Two SPA entries | `index.html` → `src/main.jsx` → `src/App.jsx` (storefront) · `admin.html` → `src/admin/main.jsx` → `src/admin/AdminApp.jsx` (portal). Declared as separate Rollup inputs in `vite.config.js` |
| Serverless | Netlify Functions in `netlify/functions/*.mts` (each declares its own `config.path`) |
| Edge | `netlify/edge-functions/share-preview.ts` |
| Data | Netlify Database (Postgres) via Drizzle ORM — `db/schema.ts`, `db/index.ts` |
| Binaries | Netlify Blobs — stores `product-photos` and `filament-photos` |
| Auth | Netlify Identity (`nf_jwt` cookie) + an email allowlist — `server/auth.ts` |
| Hosting config | `netlify.toml` (redirects, per-path cache headers) |
| Scripts | `npm run dev` · `build` · `lint` (eslint) · `typecheck` (tsc --noEmit) |

## 3. Routing and page structure

### 3.1 Server-visible routes

| URL | Handled by |
| --- | --- |
| `/` | Static shell `index.html`, **rewritten at the edge** by `netlify/edge-functions/share-preview.ts` when the request carries `?p=` |
| `/admin` | 200-rewrite to `/admin.html` (`netlify.toml`) |
| `/api/bootstrap` | `netlify/functions/bootstrap.mts` — the storefront's single startup payload |
| `/api/filaments` | `netlify/functions/filaments.mts` — public colour library (fallback path; normally arrives inside bootstrap) |
| `/api/photos/:id` | `netlify/functions/photo.mts` — streams a product photo out of Blobs |
| `/api/filament-photos/:id` | `netlify/functions/filament-photo.mts` — streams a filament example print out of Blobs |
| `/api/admin/*` | `netlify/functions/admin.mts` — the entire protected write API |
| `/sitemap.xml` | `netlify/functions/sitemap.mts` — built from the live catalogue |
| `/.netlify/images?...` | Netlify Image CDN, called through `src/lib/photos.js` |

### 3.2 Client routing (storefront)

**Hash-based, no router library.** `src/hooks/useCatalogue.js` reads
`window.location.hash` through `useSyncExternalStore` and resolves it against the
catalogue tree with the pure function `resolveRoute()`. `src/App.jsx` then picks
one view from that. There is no `/dashboard`- or `/checkout`-style path anywhere;
every in-app destination is a fragment.

| Fragment | View | Component |
| --- | --- | --- |
| *(empty)* | Featured Items — the front page: intro copy, a way into the catalogue, then the featured product grid | `src/components/LandingPage.jsx` |
| `#colours` | The filament colour library, grouped by stock status, with example-print lightboxes | `src/components/ColoursPage.jsx` |
| `#category` | One titled strip per sub-category, each listing real product cards | `src/components/CategoryPage.jsx` |
| `#category/sub` | Flat grid of that sub-category's products | `src/components/CategoryGrid.jsx` |
| `#category/sub/product` | Product page: gallery, colour/option/custom-text pickers, add to cart, related row | `src/components/ProductDisplay.jsx` |
| unknown/unresolvable | falls through to Featured Items | `resolveRoute()` returns the empty route |

Overlays are **not** routes but are backed by history entries so the Android back
button and iOS back-swipe dismiss them: the cart (`src/components/CartPanel.jsx`)
and search (`src/components/SearchOverlay.jsx`), both via
`src/hooks/useOverlay.js`.

### 3.3 Client routing (admin portal)

`src/admin/components/Dashboard.jsx` holds a `PAGES` array and renders one page
at a time from local state — no fragment, no history. The tabs are
**Catalogue** (`CataloguePage.jsx`), **Featured** (`FeaturedOrder.jsx`),
**Filaments** (`FilamentManager.jsx`), **Settings** (`SiteSettings.jsx` +
`WatermarkSettings.jsx`). The catalogue tree is fetched once in `Dashboard` and
shared through a hoisted `CatalogueStoreProvider`, so switching tabs refetches
nothing.

## 4. Core features → files

| Feature | Front end | Server / data |
| --- | --- | --- |
| Catalogue browsing | `LandingPage`, `CategoryPage`, `CategoryGrid`, `ProductDisplay`, `CascadeMenu`, `Breadcrumb`, `CardImage`, `PhotoPlaceholder` | `server/catalogue.ts` (`buildCatalogue`), `bootstrap.mts` |
| Search | `SearchOverlay.jsx` + `src/lib/search.js` (runs entirely in the browser over the in-memory tree — no endpoint) | — |
| Cart | `CartPanel.jsx`, `src/lib/cart.js` (localStorage, key `clarky3d.cart.v1`) | none — never reaches the server |
| Ordering | `src/lib/telegram.js` (`cartMessage`, `cartLink`) | none — Telegram deep link |
| Colour choice per print | `ColourPicker.jsx`, `src/lib/colourParts.js`, `src/lib/filamentSwatch.js` | `products.colour_parts` jsonb |
| Made-to-order options | `OptionPicker.jsx`, `src/lib/productOptions.js` | `products.options` jsonb |
| Per-item custom text | `CustomTextField.jsx`, `src/lib/customText.js` | `products.custom_text` jsonb |
| NEW / POPULAR watermarks | `Watermark.jsx`, `src/lib/watermark.js`, `src/styles/watermark.css` | `products.badge` + `site_settings` watermark keys |
| "Clarky designed" seal | `DesignedMark.jsx`, `designedMarkFor()` in `src/lib/watermark.js`, seal block in `src/styles/watermark.css` | `products.clarky_designed` |
| Featured page ordering | `LandingPage` (sorts on `featuredOrder`), admin `FeaturedOrder.jsx` | `products.featured_order`, `POST /api/admin/products/:id/featured-order` |
| Filament colour library | `ColoursPage.jsx`, `src/lib/filaments.js` | `server/filaments.ts`, `filaments` + `filament_photos` tables |
| Related products | `src/lib/related.js` | — |
| Share links / unfurls | `src/lib/shareLink.js` | `netlify/edge-functions/share-preview.ts` |
| Editable site copy | admin `SiteSettings.jsx` | `server/settings.ts`, `site_settings` table |
| Image delivery | `src/lib/photos.js` (presets `CARD_IMAGE`, `CARD_IMAGE_WIDE`, `MAIN_IMAGE`, `LIGHTBOX_IMAGE`) | Netlify Image CDN + `photo.mts` |
| Admin auth | `AdminApp.jsx`, `LoginScreen.jsx` | `server/auth.ts` (`requireAdmin`) |
| SEO | `index.html` meta block, `sitemap.mts`, title/canonical sync in `App.jsx` | — |

## 5. Where state lives

There is **no** state library — no Redux, no Zustand, no React Query.

- **Catalogue + settings + filaments**: fetched once by `useCatalogue()` in
  `src/hooks/useCatalogue.js` and passed down as props. `settings` is threaded
  from `App.jsx` into `LandingPage`, `CategoryPage`, `CategoryGrid` and
  `ProductDisplay` because both image marks derive their placement from it.
- **The URL fragment**: an external store read with `useSyncExternalStore`
  (`subscribeToHash` in `useCatalogue.js`). Never mirrored into state.
- **The cart**: a module-level array in `src/lib/cart.js` with its own
  subscribe/notify, exposed as `useCart()` via `useSyncExternalStore`, persisted
  to localStorage on every commit.
- **The filament library**: a module-level cached promise in
  `src/lib/filaments.js`. `primeFilaments()` seeds it from the bootstrap payload
  so no component ever refetches it.
- **Admin**: two context-backed stores — `useCatalogueTree()` /
  `CatalogueStoreProvider` in `src/admin/useCatalogueTree.js` and `useFilaments()`
  / `FilamentStoreProvider` in `src/admin/useFilaments.js`. Both expose a full
  `reload()` plus `patch*` helpers that splice a saved row back into the tree
  in place, keeping untouched branches referentially identical.

## 6. Data layer

`db/schema.ts` is the single source of truth. Tables:

- **`categories`** — `slug`, `display_name`, `theme_color` (drives `--theme-color`
  site-wide), `sort_order`.
- **`subcategories`** — FK to category, `slug` unique per category, `sort_order`.
- **`products`** — FK to subcategory, `slug` unique per subcategory,
  `display_name`, `description`, `price` (text, AUD, no currency stored),
  `featured`, `badge` (`none`/`new`/`popular`), `clarky_designed`, `hidden`,
  `colour_parts` jsonb, `options` jsonb, `custom_text` jsonb, `featured_order`,
  `sort_order`.
- **`photos`** — FK to product; **either** `blob_key` (uploaded, served by
  `/api/photos/:id`) **or** `static_url` (carried over from the original static
  site under `/products/`); plus `filaments`, `texture`, `is_default`,
  `sort_order`.
- **`site_settings`** — plain `key`/`value` rows so new editable strings need no
  migration. Defaults live in `SETTINGS_DEFAULTS` (`server/settings.ts`).
- **`filaments`** — `name`, `material`, `finish`
  (`Standard`/`Matte`/`Silk`/`Marble`/`Gradient`), `hex`, `hex2`, `colors` jsonb,
  `status` (`In Stock`/`Out of Stock`/`On Order`), `sort_order`. **The supplier /
  brand is deliberately not stored**, so it can never leak to the frontend.
- **`filament_photos`** — FK to filament, `blob_key`, `caption`, `sort_order`.

### Migrations

Generated with `npx drizzle-kit generate --name <snake_case>` into
`netlify/database/migrations/<timestamp>_<name>/`
(`drizzle.config.ts`). **Never edit, rename or delete an applied migration** —
correct a mistake by rolling forward with a new one.

### Public catalogue shape

`buildCatalogue()` in `server/catalogue.ts` turns the tables into the nested,
**slug-keyed** object the React app expects:
`{ [catSlug]: { id, displayName, theme, subCategories: { [subSlug]: { id, displayName, products: { [prodSlug]: listing } } } } }`.

Two rules that matter when touching it:

1. **Hidden products are dropped entirely** — they never appear in any payload,
   so a withdrawn listing cannot leak via the sitemap, a share link or search.
2. **Optional fields are omitted, not nulled.** `clarkyDesigned`, `colourParts`,
   `options`, `customText` and `featuredOrder` are only attached when they apply,
   so every ordinary listing keeps the exact shape it had before each feature
   existed. Normalizers (`normalizeColourParts`, `normalizeProductOptions`,
   `normalizeCustomText`) return `null` for "not applicable".

## 7. API surface

**Public (all GET, all edge-cached — see §8):** `/api/bootstrap`,
`/api/filaments`, `/api/photos/:id`, `/api/filament-photos/:id`, `/sitemap.xml`.

`/api/bootstrap` returns `{ catalogue, settings, filaments }` in one response.
This is deliberate: three separate calls meant three cold starts before anything
could render.

**Admin — `netlify/functions/admin.mts`, mounted at `/api/admin/*`.** Every
request passes `requireAdmin()` first. The router is one function that splits the
path into `[resource, idPart, action]`:

- `GET session` · `GET catalogue`
- `GET|PATCH settings`
- `categories`, `subcategories`: `POST` / `PATCH :id` / `DELETE :id`
- `products`: `POST` / `PATCH :id` / `DELETE :id` / `POST :id/featured-order`
- `photos`: `POST` (base64 upload → Blobs) / `PATCH :id` / `DELETE :id` /
  `POST :id/default`
- `filaments`: `GET` / `POST` / `PATCH :id` / `DELETE :id` / `POST :id/reorder`
- `filament-photos`: `POST` / `PATCH :id` / `DELETE :id`

Client wrapper: `src/admin/api.js` (`api('/products/12', { method: 'PATCH', body })`).

## 8. Caching

`server/cache.ts` is the whole policy.

- Public GETs are held in Netlify's **durable** edge cache effectively forever
  (`netlify-cdn-cache-control: public, durable, s-maxage=31536000`) while the
  browser is kept on `must-revalidate`, and are tagged: `CACHE_TAGS.catalogue`
  or `CACHE_TAGS.filaments`.
- Every successful admin write purges the matching tags — see `PURGE_TAGS` and
  the `purgeCache()` call in the default export of `admin.mts`. A failed purge is
  logged, never surfaced as a failed save.
- Blob-served images use `immutableAssetHeaders()`: the URL carries a row id and
  bytes never change (a replacement is a new row), so both layers keep them
  forever.
- Static asset policy (hashed bundles, fonts, `/products/*`, icons, manifest) is
  in `netlify.toml`.

**Consequence to remember:** adding a public endpoint means giving it cache
headers *and* a purge tag, or admin edits will not show up.

## 9. Quirky / non-obvious logic

Things that will look wrong unless you know why they are there.

- **Fragment routing + `?p=` share links.** A fragment never reaches the server,
  so a shared link would unfurl as the bare homepage and a crawler would see one
  page for the whole catalogue. Share links therefore carry the route as
  `?p=category/sub/product` (`src/lib/shareLink.js`); the edge function swaps the
  `<!-- social-meta:start -->…<!-- social-meta:end -->` block in `index.html` for
  that product's tags plus Product JSON-LD; `consumeShareParam()` runs in
  `src/main.jsx` **before the first render** and folds the param back into a hash
  route. **Keep those two HTML markers intact.**
- **`App.jsx` rewrites `document.title` and the canonical link on every route.**
  The document is fetched once and may already have been rewritten for a shared
  product, so without this the first product's name would stick in the tab and
  every route would canonicalise to it.
- **`--theme-color` and `--on-accent`.** Each category picks its own accent. The
  ink that sits *on* a fill of that accent is computed from WCAG luminance in
  `src/lib/onAccent.js` (`inkFor`) and published from `App.jsx`, because a dark
  accent cannot carry the near-black the buttons used to hardcode.
- **Two image marks, one photo.** `watermarkFor()` places the NEW/POPULAR mark in
  the owner-configured corner (or centred, for the `stamp` style).
  `designedMarkFor()` places the "Clarky designed" seal in the **opposite**
  corner, derived from the site setting rather than from the product's own badge —
  so the seal lands in the same corner across a whole grid and can never collide.
  On the product page the seal is pinned `top-right` explicitly, because that
  photo has no watermark and its caption occupies the bottom of the frame.
- **`badge` is one-of but `clarky_designed` is a boolean.** An image carries one
  promotional watermark, hence the enum; but where a print came from is a
  different kind of fact, and a brand-new in-house design has to be able to carry
  both marks.
- **Cart line identity.** `lineKey()` in `src/lib/cart.js` folds path + colours +
  options + custom text into one key, so the same print in different colours is
  two lines. `normalizeLine()` lifts every older saved shape forward (single
  `colour` → `colours[]`, missing `options`, missing `text`), so a cart left open
  across a deploy still opens intact. `isLine()` discards anything corrupt rather
  than letting it take the storefront down.
- **`MAX_TEXT = 500` in `cart.js` is structural, not a product rule.** The cart
  lives in one localStorage entry and the order travels as a URL. It is
  deliberately never surfaced in the UI — there is no character counter, by
  explicit request.
- **Filament cache is a promise, not data.** `src/lib/filaments.js` remembers the
  in-flight request so three consumers share one response, and a failure resolves
  to `[]` rather than rejecting, so a cached rejection can never wedge callers.
- **`ensureSeeded()`** (`server/catalogue.ts`) seeds an *empty* database from the
  frozen `src/data/seed.json` snapshot, once per container, guarded by a
  module-level flag to avoid a `count(*)` per request. It is idempotent and never
  overwrites admin edits.
- **Uploads are downscaled in the browser.** `src/admin/image.js` re-encodes to
  WebP at max 1600px before base64-ing into the request, both to stay under the
  function body limit and because the stored file is what the Image CDN re-reads
  on every uncached transform. `MAX_DIMENSION` is kept equal to `MAX_SOURCE_WIDTH`
  in `src/lib/photos.js` so the CDN is never asked to upscale.
- **`featured_order` is renumbered densely on every move** (`0..n-1`) so a swap
  works even between two items that still share a created-at default. Newly
  featured items take `min - 1` so the newest thing is top of the page.
- **`useScrollReset`** puts a new route at the top but deliberately leaves back /
  forward alone, and tells overlay history pops apart from real navigation by
  checking whether the route actually changed.
- **`useOverlay` pushes/pops history inside the open/close callbacks**, not in an
  effect — an effect would fire twice under StrictMode.
- **The `/` and Cmd/Ctrl-K search shortcuts** are wired in `App.jsx` and are
  ignored while the caret is in a field.
- **The skip link intercepts its own click** and moves focus directly, because
  `href="#main"` would be read as a catalogue route.
- **Constants are duplicated across the client/server boundary on purpose**, with
  "keep in sync" comments: `MAX_COLOUR_PARTS`, `MAX_PRODUCT_OPTIONS`,
  `MAX_OPTION_CHOICES`, `MAX_CUSTOM_TEXT_LABEL`, `MAX_GRADIENT_COLORS`,
  `MAX_SOURCE_WIDTH`/`MAX_DIMENSION`, and the watermark style/position lists in
  `server/settings.ts` vs `src/lib/watermark.js`. Change one, change its twin.
- **`admin.mts` route ordering is load-bearing.** The generic
  `if (method === "POST")` branch inside a resource does **not** test `!idPart`,
  so any `POST :id/action` route must be declared *before* it.
- **Auth fails closed.** With `ADMIN_EMAILS` unset, nobody is an admin, even if
  Identity signups are open.

## 10. Conventions

- **CSS**: `src/styles/global.css` (storefront, imports `fonts.css` +
  `watermark.css`), `src/admin/admin.css` (portal, imports the same two).
  Fonts are self-hosted: `--body` Exo 2, `--mono` Space Mono, `--pixel`
  Press Start 2P. Inputs use `max(16px, …)` font sizes to stop iOS zooming on
  focus. Admin classes are all `a-` prefixed. Image-mark styles live in
  `watermark.css`, not `global.css`.
- **Comments** explain *why*, often including the problem the code replaced.
  Match that register; do not strip it.
- **Server modules** (`server/*.ts`) hold shared logic and normalizers and are
  imported by the functions — functions stay thin.
- **Netlify primitives only** for storage: Database for rows, Blobs for binaries.
  No local JSON files, no in-memory stores, no third-party database.

## 11. Environment

- `ADMIN_EMAILS` — comma-separated admin allowlist (required for portal access).
- Database connection is injected by the Netlify runtime; `db/index.ts` takes no
  config.
- Never print secret values into output, logs, or this file.

---

## End-of-Run Routine

**At the conclusion of every agent run, before committing your code, you MUST
update this blueprint to reflect any new features, folder changes, or
architectural logic you just introduced.**

In practice that means, before you finish:

1. Re-read the sections above that touch what you changed.
2. Add new features to §4, new routes to §3, new tables or columns to §6, new
   endpoints to §7, and anything surprising to §9.
3. Delete or correct anything your change made untrue — a stale line here is
   worse than a missing one, because the next run will trust it.
4. Update the **Last verified against** line at the top to the commit you worked
   from and today's date — but only if you genuinely checked the sections you
   touched against the code. It is a claim about accuracy, not a timestamp of
   the last edit; moving it without checking is how the file starts lying.
