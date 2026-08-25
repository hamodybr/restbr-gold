# RESTBR Gold

`restbr-gold` is the clean, production-intended foundation for the RESTBR restaurant menu platform.

## Goal
Build one reusable restaurant template that preserves the public-menu and admin-dashboard experience of the proven SHORASH application while making the data architecture truly multi-tenant.

Final provisioning target:

**Create Restaurant → Supabase → Subdomain → Ready**

A restaurant must receive:
- a public menu on its own subdomain;
- the full restaurant admin dashboard;
- isolated settings, categories, products, options, discounts, orders, analytics and files;
- its own authorized users and roles;
- no dependency on data from any other restaurant.

## Gold-standard reference
The visual and functional reference is the stable single-restaurant SHORASH repository:

- Repository: `hamodybr/restbr-menu-app`
- Reference branch: `main`
- Pinned reference commit: `86a18a57e3684b1d36a1bd9a8470f6a4c9549497`
- Public menu reference: `https://hamodybr.github.io/restbr-menu-app/`
- Admin reference: `https://hamodybr.github.io/restbr-menu-app/admin.html`

The reference repository is READ-ONLY for this project. We copy proven behavior intentionally; we do not modify the reference to make the platform work.

## Clean-room rule
Do NOT copy experimental compatibility layers from previous RESTBR attempts.

Explicitly forbidden in this repository unless introduced later through a reviewed architectural decision:
- nested Supabase client proxies;
- query-builder monkey patches;
- recursive client wrappers;
- cross-tenant static fallbacks;
- restaurant-specific hard-coded data;
- shared browser cache keys for tenant data;
- URL `?rid=` as the production tenant identity mechanism;
- service-role credentials in browser code;
- data writes without tenant scope;
- temporary diagnostic scripts committed as permanent runtime dependencies.

## Documentation
Read these before changing runtime code:
- `docs/GOLD_STANDARD.md`
- `docs/ARCHITECTURE.md`
- `docs/TENANT_RULES.md`
- `docs/ROADMAP.md`

## Development principle
One concern has one owner:
- Tenant identity: one tenant-context module.
- Database access: one data-access layer.
- Authentication/authorization: one auth layer plus database RLS.
- Browser persistence: one tenant-aware storage namespace.
- PWA caching: one scoped service-worker strategy.

If a feature requires wrapping one of these systems with another compatibility wrapper, stop and redesign the underlying interface instead.
