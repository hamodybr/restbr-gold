# RESTBR Gold Architecture

## 1. Core objective

RESTBR Gold is a multi-tenant restaurant menu platform using one reusable application template. Restaurants do not receive independent code forks. They receive isolated database records, files, users and domain routing.

Target lifecycle:

1. Platform admin creates restaurant.
2. Database creates restaurant and empty settings.
3. Owner membership is attached.
4. Subdomain/domain is registered.
5. Public menu resolves tenant from hostname.
6. `admin.html` resolves the same tenant and authorizes the signed-in user.
7. Restaurant begins with an empty catalog and fills its own categories/products/options/discounts.

## 2. Runtime boundaries

### Public application
Responsibilities:
- resolve current tenant;
- fetch only public data for that tenant;
- render the SHORASH-compatible menu;
- compute current dine-in/takeaway prices and discounts;
- manage cart in a tenant-scoped browser namespace;
- compose WhatsApp order;
- emit tenant-scoped analytics;
- never access private administration data.

### Restaurant admin
Responsibilities:
- require Supabase Auth session;
- resolve current tenant from hostname;
- verify membership/role for that tenant;
- operate only on current tenant data;
- preserve SHORASH admin UX;
- never hold service-role secrets in the browser.

### Platform/control plane
Responsibilities:
- create/suspend restaurants;
- attach domains/subdomains;
- assign initial owner;
- manage subscription/platform metadata;
- perform privileged provisioning operations through server-side trusted code.

The restaurant template must not contain platform-admin provisioning credentials.

## 3. Tenant identity

Production tenant identity comes from hostname/domain routing, not an editable query string.

Examples:
- `coffee.restbr.com` → restaurant `coffee`
- `myrestaurant.com` → verified custom domain → mapped restaurant

One module owns this concern: `src/core/tenant-context.js`.

It returns an immutable context similar to:

```js
{
  restaurantId,
  slug,
  hostname,
  source: 'subdomain' | 'custom-domain' | 'development'
}
```

Runtime modules must consume tenant context; they must not independently parse URL parameters or query the domain table.

Development may support an explicit dev-only tenant selector, but production builds must not trust `?rid=` as tenant identity.

## 4. Data-access architecture

One data layer owns database operations.

Suggested modules:
- `src/data/public-menu-repository.js`
- `src/data/admin-repository.js`
- `src/data/storage-repository.js`
- `src/data/analytics-repository.js`

These modules use one Supabase client configured once.

Rules:
- no monkey-patching `.from()`;
- no recursive Proxy wrappers;
- no fallback client implementing a partial Supabase API;
- no direct `.from()` calls scattered throughout visual feature scripts after migration is complete;
- every tenant-owned operation receives tenant context explicitly or obtains it from the immutable application context;
- database RLS remains the final enforcement layer even when code supplies `restaurant_id` filters.

## 5. Database shape

Every tenant-owned table includes `restaurant_id uuid not null` and a foreign key to `restaurants(id)`.

Core tables:
- `restaurants`
- `restaurant_domains`
- `restaurant_members`
- `restaurant_settings`
- `categories`
- `products`
- `product_options`
- `discounts`
- `orders`
- `order_items`
- `menu_analytics_daily`
- `audit_logs`
- optional `subscriptions`
- `platform_admins`

The database must prevent cross-restaurant child relationships. Example: a product for Restaurant A must not reference a category owned by Restaurant B. Implement composite tenant-aware integrity where appropriate, not only application checks.

## 6. Authentication and roles

Supabase Auth provides identity.

Application roles are stored in `restaurant_members`:
- `owner`
- `manager`
- `editor`
- `viewer`

Platform-wide administration is stored separately in `platform_admins`.

Expected permissions:
- platform admin: may administer all restaurants through platform-approved paths;
- owner: full restaurant administration except platform-only operations;
- manager: operational/menu/settings administration according to policy;
- editor: catalog/content editing, limited sensitive settings;
- viewer: read-only dashboard/analytics where enabled.

RLS must enforce permissions independently of UI visibility.

## 7. Storage architecture

Use a shared bucket such as `menu-images`, but namespace every object by tenant:

```text
<restaurant_id>/products/<product_id>/<uuid>.<ext>
<restaurant_id>/branding/logo/<uuid>.<ext>
<restaurant_id>/branding/background/<uuid>.<ext>
<restaurant_id>/categories/<category_id>/<uuid>.<ext>
```

Storage policies must verify that authenticated writers belong to the restaurant represented by the first path segment.

A restaurant must never list, update or delete another restaurant's objects.

## 8. Settings architecture

`restaurant_settings` has exactly one row per restaurant (`unique restaurant_id`).

Prefer explicit columns for business-critical fields and JSONB for extensible UI collections/design objects.

Examples of explicit fields:
- names/subtitles in AR/KU/EN;
- phone/WhatsApp/location;
- logo/background URLs;
- menu/open/orders/delivery/pickup status;
- announcement text;
- delivery info;
- public visibility toggles;
- restaurant schedule mode and schedule;
- enabled languages.

JSONB may hold:
- `ui_design_settings`;
- custom social links/actions;
- extensible feature configuration.

Do not maintain duplicate aliases forever. During initial build, define one canonical field for each concept and adapt SHORASH UI code to it.

## 9. Pricing model

The source-of-truth sellable price lives on product options.

Each product has at least one option, including a generated default option for products that appear to users as having no explicit variants.

Option fields include:
- `price` = dine-in price;
- `takeaway_price` = takeaway price (default may equal dine-in price);
- availability;
- sort order.

`products.base_price` may exist as a denormalized display/helper value but must not become a conflicting second source of truth.

## 10. Discount model

Percentage discount fields:
- `restaurant_id`
- `discount_percent`
- `price_mode`: `dine_in | takeaway | both`
- `scope_type`: `restaurant | category | product`
- `target_id` nullable for restaurant-wide scope
- `is_active`

Discount evaluation must be deterministic and shared between public display/cart/order calculations. Do not implement separate competing discount calculators.

## 11. Browser persistence

All tenant-owned browser state uses a namespace derived from restaurant ID or an immutable tenant cache key:

```text
restbr:<tenant>:language
restbr:<tenant>:cart
restbr:<tenant>:brand-cache
restbr:<tenant>:menu-cache
restbr:<tenant>:intro-seen
```

No tenant data may be stored under a global key shared by different restaurants on the same origin.

## 12. PWA/service worker

The service worker must be designed for one deployment origin serving many tenants.

Requirements:
- static application shell can be shared when content is tenant-neutral;
- tenant data responses must not be put into a global cache key;
- navigations must not fall back to another tenant's rendered/data state;
- cache version upgrades delete only RESTBR Gold caches, not unrelated origin caches;
- never bundle a real restaurant's `data/menu.json` as an offline fallback;
- offline tenant snapshots, if implemented, must be keyed by restaurant identity and validated before display.

## 13. Domain routing

Subdomain routing should resolve tenant before app bootstrap.

Preferred production flow:
1. request hostname arrives at router/edge;
2. router maps hostname to active verified `restaurant_domains` row;
3. router serves the shared application;
4. application receives trusted/validated tenant bootstrap data or resolves using a safe public endpoint;
5. public requests remain RLS-scoped to that tenant.

Custom domains must use the same model.

## 14. Provisioning

Provisioning must be idempotent and transactional where possible.

Input:
- restaurant display name;
- unique slug;
- default language/timezone/currency;
- initial owner user/email;
- desired subdomain.

Output:
- `restaurants` row;
- one empty `restaurant_settings` row;
- owner membership;
- primary domain/subdomain mapping;
- empty catalog (0 categories/products/options/discounts);
- no copied SHORASH content;
- ready public/admin URLs.

Partial failure must be observable and recoverable. Do not leave invisible half-created tenants.

## 15. Error handling

Error handling is explicit and non-recursive.

- One bootstrap path.
- One data client.
- No Proxy-around-Proxy compatibility layers.
- Network failure shows a clear tenant-safe error.
- Never replace an error by showing another restaurant's static data.
- Errors include enough context for diagnostics but never expose secrets.

The previous `Maximum call stack size exceeded` class of failure is a regression target: architecture/tests must ensure no client wrapper recursively calls itself.
