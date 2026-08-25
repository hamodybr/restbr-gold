import assert from 'node:assert/strict';

import { resolveTenantContext } from '../src/core/tenant-context.js';
import { createRestaurantRepository } from '../src/data/restaurant-repository.js';
import { supabaseRestAdapter } from '../src/data/adapters/supabase-rest-adapter.js';
import { resolveBackgroundVideoUrl } from '../src/config/defaults.js';

const EXPECTED_ID = '2bc9d2b1-68f3-4969-81b3-ec5dade417b2';
const repository = createRestaurantRepository({ adapter: supabaseRestAdapter });

const tenant = await resolveTenantContext({
  hostname: 'yourcoffee-test.restbr.com',
  platformDomain: 'restbr.com',
  resolveDomain: (request) => repository.resolveDomain(request)
});

assert.equal(tenant.restaurantId, EXPECTED_ID);
assert.equal(tenant.slug, 'yourcoffee-test');

const model = await repository.getPublicMenu(tenant);
assert.equal(model.restaurant.id, EXPECTED_ID);
assert.ok(model.categories.length > 0, 'YourCoffee should expose at least one public category');
assert.ok(model.products.length > 0, 'YourCoffee should expose at least one public product');
assert.ok(model.products.every((product) => model.categories.some((category) => category.id === product.category_id)));
assert.ok(resolveBackgroundVideoUrl(model.settings));

console.log(JSON.stringify({
  tenant: model.tenant,
  categories: model.categories.length,
  products: model.products.length,
  options: model.products.reduce((sum, product) => sum + product.options.length, 0),
  discounts: model.discounts.length,
  backgroundVideo: resolveBackgroundVideoUrl(model.settings)
}, null, 2));
