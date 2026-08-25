# Tenant Safety Rules

These rules are mandatory for every feature in RESTBR Gold.

## Rule 1 — Tenant identity has one source
Production tenant identity is derived from validated hostname/domain routing through `tenant-context`.

Forbidden:
- trusting `?rid=` or arbitrary query parameters in production;
- letting individual feature modules resolve tenant independently;
- storing a mutable global restaurant ID that arbitrary scripts can overwrite.

## Rule 2 — Every tenant-owned table has `restaurant_id`
Required on:
- restaurant_settings
- categories
- products
- product_options
- discounts
- orders
- order_items
- menu_analytics_daily
- audit_logs
- tenant-owned future tables

Foreign keys and indexes must support tenant-scoped access.

## Rule 3 — RLS is mandatory
UI filtering is not security.

For every tenant-owned table:
- public read policies expose only data intended for public menu display;
- authenticated policies require current membership/role for the same restaurant;
- platform administration uses a deliberate platform-admin policy or trusted server path;
- cross-tenant rows are invisible even if a caller guesses a UUID.

## Rule 4 — Writes always bind restaurant identity
Insert/update/delete code must never rely on an untrusted form field for restaurant identity.

Insert payload restaurant ID comes from trusted tenant context.
Update/delete operations include tenant scope even when RLS also protects them.

## Rule 5 — Parent/child tenant integrity
Application code and database constraints must prevent:
- Product A referencing Category B from another restaurant.
- Option A referencing Product B from another restaurant.
- Discount target referencing a category/product from another restaurant.
- Order item referencing another restaurant's order/product/option.

## Rule 6 — Storage path starts with tenant ID
Every tenant file path begins with immutable restaurant ID.

Never use restaurant display name or mutable slug as the security boundary.

## Rule 7 — Browser storage is tenant namespaced
Any localStorage/sessionStorage/IndexedDB/cache containing restaurant data must include tenant identity in its key.

Forbidden examples:
- `SHORASH_MENU_OFFLINE_CACHE_V1`
- `SHORASH_BRAND_CACHE_V1`
- global `cart`

Required pattern:
- `restbr:<tenant-id>:menu-cache:v1`
- `restbr:<tenant-id>:brand-cache:v1`
- `restbr:<tenant-id>:cart:v1`

## Rule 8 — Static application files contain no restaurant data
The repository may include neutral placeholders and fixtures only.

Forbidden:
- production restaurant menu JSON;
- real restaurant logo used as universal fallback;
- real phone/WhatsApp/address baked into HTML/JS;
- real background media as the fallback for all tenants.

## Rule 9 — Offline mode is fail-safe
If tenant data cannot load:
- show an offline/error state; or
- show only a previously cached snapshot verified to belong to the same tenant.

Never display another tenant's cached/static data.

## Rule 10 — Authorization is tenant-specific
A signed-in user is not automatically an admin of the current restaurant.

Admin bootstrap must verify one of:
- active platform admin; or
- active restaurant membership for the current tenant.

A member of Restaurant A must be denied on Restaurant B even with a valid session.

## Rule 11 — Service role never reaches browser
Service role keys and privileged provisioning credentials belong only in trusted server/edge functions.

## Rule 12 — Destructive operations are scoped and guarded
Restaurant reset/restore/bulk delete must:
- explicitly bind restaurant_id;
- preview affected counts;
- require a challenge/confirmation;
- verify state has not changed when executing if practical;
- delete only current tenant storage prefix;
- leave membership/platform records according to documented policy;
- generate audit records.

## Rule 13 — Backups identify tenant
Backup manifest must include:
- format version;
- source restaurant ID;
- source slug/name for display only;
- created timestamp;
- table counts;
- optional media manifest/checksums.

Restoring into a target restaurant must rewrite ownership to the target restaurant deliberately and validate all relationships.

## Rule 14 — Analytics are tenant-scoped
Every event aggregation key includes restaurant_id.
No dashboard query may aggregate another tenant unless it is explicitly a platform-admin global report.

## Rule 15 — Tests must attempt attacks, not only happy paths
Every data feature is incomplete until tests prove:
- tenant A can operate on A;
- tenant B can operate on B;
- A cannot read private B data;
- A cannot mutate B data using guessed IDs;
- A cannot upload/list/delete B files;
- stale cache for A never renders under B hostname.

## Rule 16 — No compatibility recursion
Never monkey-patch a Supabase client/query builder by forwarding methods back to the same wrapped object.

If the data API needs a new contract, write a clean repository function with explicit inputs/outputs.

This rule exists specifically to prevent stack-overflow failures such as `Maximum call stack size exceeded` seen in prior experiments.

## Pull-request checklist
Before merging tenant-owned functionality, verify:
- [ ] Tenant context is resolved once.
- [ ] No production `?rid=` trust.
- [ ] DB operation is tenant scoped.
- [ ] RLS policy exists and has a negative cross-tenant test.
- [ ] Storage key/path is tenant scoped.
- [ ] Browser cache key is tenant scoped.
- [ ] No real restaurant data is committed as fallback.
- [ ] Role permission is documented.
- [ ] Audit behavior is documented for sensitive mutations.
- [ ] Error path cannot expose another tenant.
