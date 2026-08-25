# RESTBR Gold Build Roadmap

The project is intentionally rebuilt in layers. Do not skip directly to provisioning before the shared template is proven safe.

## Phase 0 — Clean foundation
Status target: first stable baseline.

Deliverables:
- repository initialized from empty;
- pinned SHORASH gold-standard documentation;
- architecture and tenant rules;
- neutral project structure;
- one tenant-context module contract;
- one Supabase client bootstrap contract;
- one browser-storage namespace helper;
- no restaurant production data in repository;
- CI checks for syntax and forbidden patterns.

Exit criteria:
- clean repository contains no experimental RESTBR patch files;
- no hard-coded SHORASH Supabase credentials/content;
- architecture review complete.

## Phase 1 — Public menu visual parity
Port the public menu from pinned SHORASH.

Deliverables:
- index shell;
- original CSS and visual behavior;
- tri-language behavior;
- intro/header/actions/footer;
- category navigation;
- product cards;
- product option sheet;
- dine-in/takeaway gate;
- cart/WhatsApp UX;
- opening-hours behavior;
- announcement, background and design settings.

Important: use fixtures/local neutral data first. Do not solve multi-tenancy by patching UI scripts.

Exit criteria:
- screenshot/interaction parity against SHORASH with neutral fixture data;
- no SHORASH-specific content remains.

## Phase 2 — Admin dashboard visual/functional parity
Port `admin.html` and its feature modules from pinned SHORASH.

Deliverables:
- home dashboard;
- categories;
- products and options;
- image uploads;
- ordering/filtering;
- complete settings page;
- discounts;
- bulk pricing;
- Excel import/export;
- backup/restore UI;
- account/user-management UI;
- analytics UI;
- reset UI.

Initially bind against a clean repository interface/mock to preserve UI parity before final DB wiring.

Exit criteria:
- admin UI matches pinned source;
- no single-restaurant assumptions remain in UI contract.

## Phase 3 — Fresh Supabase multi-tenant schema
Create schema from scratch rather than mutating legacy SHORASH tables.

Tables:
- restaurants
- restaurant_domains
- platform_admins
- restaurant_members
- restaurant_settings
- categories
- products
- product_options
- discounts
- orders
- order_items
- menu_analytics_daily
- audit_logs
- subscriptions if needed

Deliverables:
- migrations in repository;
- indexes and constraints;
- automatic timestamps;
- one-settings-row-per-restaurant constraint;
- tenant-aware parent/child integrity;
- RLS and grants;
- seed only for test tenants, never real restaurant data.

Exit criteria:
- migration succeeds on a fresh Supabase project;
- automated cross-tenant negative tests pass.

## Phase 4 — Data-access integration
Wire public/admin repository modules to Supabase.

Deliverables:
- public menu repository;
- admin CRUD repository;
- pricing/discount service;
- analytics repository;
- order repository;
- consistent typed/documented return shapes;
- no scattered direct DB access in view scripts.

Exit criteria:
- two test tenants can be used simultaneously without data mixing;
- public menu and admin work in fresh/private browser sessions.

## Phase 5 — Storage isolation
Deliverables:
- `menu-images` bucket policy;
- tenant-prefixed object paths;
- product/category/logo/background upload helpers;
- file replacement/deletion behavior;
- storage cleanup for reset;
- cross-tenant storage tests.

Exit criteria:
- Tenant A cannot list/read-private/write/delete Tenant B objects outside intended public URLs.

## Phase 6 — Authentication and restaurant roles
Deliverables:
- Supabase Auth integration;
- platform admin check;
- restaurant membership resolver;
- owner/manager/editor/viewer policy;
- account/password/email flows compatible with original UX;
- user invitation/management flow implemented using trusted server functions where required.

Exit criteria:
- valid login without membership is denied;
- each role has tested permissions;
- platform admin access is explicit and auditable.

## Phase 7 — PWA/cache hardening
Deliverables:
- tenant-neutral static application-shell cache;
- tenant-scoped local data caches;
- safe service-worker upgrades;
- no real static menu fallback;
- deterministic offline/error state;
- browser normal/private regression suite.

Regression tests include:
- stale Tenant A cache + open Tenant B URL;
- service-worker upgrade;
- offline bootstrap;
- cache clear;
- concurrent tabs for two tenants.

Exit criteria:
- another restaurant can never appear because of stale browser cache.

## Phase 8 — Subdomain/domain routing
Deliverables:
- wildcard `*.restbr.com` design;
- hostname-to-restaurant mapping;
- verified custom-domain mapping;
- inactive/suspended tenant behavior;
- trusted bootstrap contract;
- admin and public URL behavior.

Production examples:
- `coffee.restbr.com/`
- `coffee.restbr.com/admin.html`

Exit criteria:
- no production `?rid=` requirement;
- host resolution is deterministic and tested.

## Phase 9 — Restaurant provisioning
Implement final desired workflow:

**Create Restaurant → Supabase → Subdomain → Ready**

Provisioning creates:
- restaurant row;
- empty settings row;
- owner membership;
- subdomain mapping;
- optional subscription row;
- zero categories;
- zero products;
- zero options;
- zero discounts;
- zero orders;
- tenant storage prefix is ready but empty.

Deliverables:
- trusted provisioning endpoint/function;
- idempotency key/status;
- rollback/recovery behavior;
- platform-admin UI action;
- provisioning audit log.

Exit criteria:
- new restaurant can be created without editing repository code or deploying a custom fork;
- public menu opens as an empty branded template;
- owner can log in and populate everything from admin dashboard.

## Phase 10 — Backup, restore and safe reset
Deliverables:
- tenant-only export;
- restore validation and ownership rewrite;
- optional media archive/manifest;
- reset preview counts;
- guarded reset execution;
- audit records;
- no membership/platform deletion unless explicitly selected by platform-only policy.

Exit criteria:
- reset of Tenant A leaves Tenant B byte-for-byte/logically unchanged.

## Phase 11 — Production acceptance
Test matrix:
- iPhone Safari normal/private;
- Android Chrome;
- desktop Chrome/Edge/Safari;
- Arabic/Kurdish/English;
- two tenants concurrently;
- two different admin users;
- custom domain and RESTBR subdomain;
- cache/offline/service-worker upgrades;
- discounts + dine-in/takeaway pricing;
- uploads;
- backup/restore;
- Excel;
- analytics/orders;
- safe reset.

Final release is tagged only after the matrix passes.
