# Phase 1A — Public Menu Parity Checkpoint

Status: **Code-complete for visual review; backend intentionally absent.**

Gold Standard reference:

- Repository: `hamodybr/restbr-menu-app`
- Commit: `86a18a57e3684b1d36a1bd9a8470f6a4c9549497`
- Public page reference: `/index.html`

## Byte-identical visual assets

The following files are copied byte-for-byte from the pinned Gold Standard and are verified by CI using their Git blob hashes:

- `css/style.css`
- `css/cart.css`
- `css/desktop-phone-parity.css`
- `css/english-card-ltr.css`
- `css/mobile-card-image-fix.css`
- `reference/gold-standard/index.html`

## Implemented public behavior in the neutral fixture

- Intro presentation
- Restaurant header/title/subtitle
- Compact header search button
- Compact language button and popup menu
- Arabic / Kurdish / English direction switching
- Top quick actions
- Animated announcement/news ticker
- Horizontal category rail
- One active category at a time, matching the Gold runtime
- Sticky category rail while scrolling
- Scroll progress indicator
- Back-to-top button
- Gold product-card DOM ordering and class names
- Category-specific card effect classes
- Popular / hot / offer badges
- Product and category share buttons
- Search across all languages, categories and options
- Search-results state and no-results state
- Product option rows
- Dine-in prices
- Takeaway prices
- Product/category discount preview
- Gold dining/takeaway gate copy and styling
- Dine-in mode hides ordering/cart controls, matching Gold behavior
- Takeaway mode enables ordering/cart controls
- Direct add-to-cart
- Multi-option chooser sheet
- Cart drawer
- Quantity increase/decrease/remove/clear
- Cart total
- Product image viewer
- IntersectionObserver card reveal
- Mobile and desktop parity styles inherited from the pinned Gold CSS

## Intentional differences during Phase 1A

These are deliberate and are NOT missing production requirements:

- The restaurant is a neutral local fixture, not a real tenant.
- Product images are generated neutral placeholders.
- The logo is a neutral `G` placeholder.
- Links do not point to a real restaurant.
- No network/database client is loaded.
- No authentication is loaded.
- No service worker is registered.
- No offline restaurant-data fallback exists.
- No persistent browser cache is used.
- No analytics are sent.

These differences prevent accidental coupling to SHORASH or another restaurant before the clean tenant-aware data layer exists.

## Required review gate

Do not begin the production data integration until the public page has been opened as a hosted preview and visually compared against the pinned SHORASH Gold Standard on mobile.

After visual approval:

1. Create `stable-public-ui-v1`.
2. Begin Phase 1B — clean tenant-aware public data layer.
3. Resolve restaurant identity from hostname through the single Tenant Context.
4. Keep UI code independent of tenant resolution and database transport.
5. Do not introduce fallback clients, recursive wrappers, or global restaurant caches.
