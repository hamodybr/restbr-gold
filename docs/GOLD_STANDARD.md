# Gold Standard: SHORASH

## Pinned source of truth

RESTBR Gold must preserve the user-facing behavior and visual identity of the stable SHORASH application at:

- Source repository: `hamodybr/restbr-menu-app`
- Pinned commit: `86a18a57e3684b1d36a1bd9a8470f6a4c9549497`
- Public menu: `https://hamodybr.github.io/restbr-menu-app/`
- Admin dashboard: `https://hamodybr.github.io/restbr-menu-app/admin.html`

Do not silently follow later experimental RESTBR code when it conflicts with this pinned reference.

## What “exact copy” means

The target is not merely a similar color scheme. The following must preserve SHORASH behavior unless a tenant-safety requirement makes a direct copy unsafe:

### Public menu
- intro/splash behavior;
- Arabic, Kurdish and English language handling;
- RTL/LTR behavior;
- restaurant logo, title and subtitle;
- background video and overlay;
- top action buttons;
- announcement/ticker;
- sticky category navigation and progress indicator;
- category and product card presentation;
- product image fallback behavior, rewritten to use current-tenant branding only;
- product availability semantics;
- category/product schedules;
- product-option sheet;
- dine-in vs takeaway gate;
- different dine-in/takeaway prices;
- percentage discounts;
- cart UX;
- WhatsApp order composition;
- floating cart behavior;
- restaurant opening-hours policy;
- footer, social links and actions;
- back-to-top behavior;
- phone/desktop visual parity;
- PWA/offline behavior, redesigned for tenant safety.

### Admin dashboard
The final dashboard must preserve the original navigation and feature set, including:
- home/dashboard summary;
- categories: create, edit, hide/show, activate/deactivate, sort;
- products: create, edit, image upload, visibility, availability, category filtering, ordering;
- product options: create/edit/delete/order, dine-in price, takeaway price, availability;
- settings accordions and original visual hierarchy;
- menu/order status controls;
- identity and public-menu branding;
- dine-in/takeaway first-window texts;
- discounts;
- menu sizing/design controls;
- phone/location/WhatsApp/top actions;
- social media;
- footer controls;
- announcements and delivery information;
- background appearance/video;
- bulk price changes;
- Excel export/import including dine-in/takeaway prices;
- full backup/restore;
- current account controls;
- user/role management;
- analytics;
- reset/sensitive administration with safe confirmation architecture.

## What must NOT be copied literally

The following are single-restaurant implementation details and are not gold-standard architecture:
- hard-coded SHORASH Supabase URL/key;
- single-row `restaurant_settings` assumptions without `restaurant_id`;
- `admin_users` as the only authorization model;
- global localStorage keys such as SHORASH-only cache keys;
- `data/menu.json` containing a real restaurant menu;
- a service worker that can collide with another restaurant's cache;
- any code that assumes all categories/products/options belong to one restaurant;
- any browser-side service-role use;
- any destructive reset that is not tenant-scoped.

## Reference-file policy

When porting a feature:
1. Inspect the pinned SHORASH source implementation.
2. Preserve DOM structure, CSS behavior and user workflow where safe.
3. Replace only the data/auth/cache assumptions that are single-tenant.
4. Add tenant-isolation tests before marking the port complete.
5. Do not introduce a compatibility wrapper around a broken abstraction; modify the clean abstraction instead.

## Visual acceptance

Visual parity is checked on at least:
- iPhone/Safari portrait;
- Android/Chrome portrait;
- desktop Chrome/Safari/Edge;
- Arabic RTL;
- Kurdish RTL;
- English LTR;
- light/dark admin presentation where supported by the original dashboard.

A feature is not complete merely because the database operation works. It must also match the original interaction and presentation closely enough that a SHORASH admin user recognizes it as the same product.
