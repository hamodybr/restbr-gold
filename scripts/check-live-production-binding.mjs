import assert from 'node:assert/strict';

import { resolveTenantContext } from '../src/core/tenant-context.js';
import { createRestaurantRepository } from '../src/data/restaurant-repository.js';
import { fixtureAdapter } from '../src/data/adapters/fixture-adapter.js';
import { supabaseRestAdapter } from '../src/data/adapters/supabase-rest-adapter.js';
import { selectPublicAdapter } from '../src/bootstrap/public-adapter-selector.js';

const hostname = 'yourcoffee-test.restbr.com';
const expectedRestaurantId = '2bc9d2b1-68f3-4969-81b3-ec5dade417b2';

const productionAdapter = selectPublicAdapter({
  hostname,
  fixtureAdapter,
  productionAdapter: supabaseRestAdapter
});
assert.equal(productionAdapter, supabaseRestAdapter);

const previewAdapter = selectPublicAdapter({
  hostname: 'hamodybr.github.io',
  fixtureAdapter,
  productionAdapter: supabaseRestAdapter
});
assert.equal(previewAdapter, fixtureAdapter);

const repository = createRestaurantRepository({ adapter: productionAdapter });
const tenant = await resolveTenantContext({
  hostname,
  search: '?rid=00000000-0000-0000-0000-000000000000&tenant=wrong',
  platformDomain: 'restbr.com',
  resolveDomain: (request) => repository.resolveDomain(request)
});

assert.equal(tenant.restaurantId, expectedRestaurantId);
assert.equal(tenant.slug, 'yourcoffee-test');

const model = await repository.getPublicMenu(tenant);
assert.equal(model.restaurant.id, expectedRestaurantId);
assert.ok(model.categories.length > 0);
assert.ok(model.products.length > 0);

console.log(JSON.stringify({
  host: hostname,
  source: tenant.source,
  adapter: 'supabase-rest',
  restaurantId: tenant.restaurantId,
  slug: tenant.slug,
  categories: model.categories.length,
  products: model.products.length,
  options: model.products.reduce((total, product) => total + product.options.length, 0),
  discounts: model.discounts.length,
  productionQuerySelectorsIgnored: true,
  githubPreviewUsesFixture: true
}, null, 2));
