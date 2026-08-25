import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTenantContext } from '../src/core/tenant-context.js';
import { createRestaurantRepository } from '../src/data/restaurant-repository.js';
import { normalizePublicMenuBundle } from '../src/data/public-menu-model.js';
import { fixtureAdapter } from '../src/data/adapters/fixture-adapter.js';
import { DEFAULT_BACKGROUND_VIDEO_URL } from '../src/config/defaults.js';

const EXPECTED_VIDEO = 'https://github.com/hamodybr/-shorash-assets/raw/refs/heads/main/shorash-bg.MP4';

test('canonical default background video is pinned', () => {
  assert.equal(DEFAULT_BACKGROUND_VIDEO_URL, EXPECTED_VIDEO);
});

test('repository resolves tenant then returns normalized menu model', async () => {
  const repository = createRestaurantRepository({ adapter: fixtureAdapter });
  const tenant = await resolveTenantContext({
    hostname: 'hamodybr.github.io',
    resolveDomain: (request) => repository.resolveDomain(request)
  });

  const model = await repository.getPublicMenu(tenant);

  assert.equal(model.tenant.restaurantId, tenant.restaurantId);
  assert.equal(model.tenant.slug, 'gold-demo');
  assert.equal(model.categories.length, 3);
  assert.equal(model.products.length, 4);
  assert.equal(model.products.find((row) => row.id === 'prod-coffee').options.length, 2);
  assert.equal(model.discounts.length, 2);
  assert.ok(Object.isFrozen(model));
  assert.ok(Object.isFrozen(model.products));
});

test('normalizer rejects a row from another restaurant', () => {
  const tenant = {
    restaurantId: 'tenant-a',
    slug: 'a',
    hostname: 'a.restbr.com',
    source: 'subdomain'
  };

  assert.throws(() => normalizePublicMenuBundle({
    tenant,
    payload: {
      restaurant: { id: 'tenant-a', slug: 'a' },
      settings: { restaurant_id: 'tenant-a' },
      categories: [{ id: 'cat-a', restaurant_id: 'tenant-a', sort_order: 1 }],
      products: [{ id: 'prod-b', category_id: 'cat-a', restaurant_id: 'tenant-b' }],
      productOptions: [],
      discounts: []
    }
  }), /CROSS_TENANT_PRODUCT_ROW/);
});

test('normalizer rejects option rows whose product does not exist', () => {
  const tenant = {
    restaurantId: 'tenant-a',
    slug: 'a',
    hostname: 'a.restbr.com',
    source: 'subdomain'
  };

  assert.throws(() => normalizePublicMenuBundle({
    tenant,
    payload: {
      restaurant: { id: 'tenant-a', slug: 'a' },
      settings: { restaurant_id: 'tenant-a' },
      categories: [{ id: 'cat-a', restaurant_id: 'tenant-a', sort_order: 1 }],
      products: [{ id: 'prod-a', category_id: 'cat-a', restaurant_id: 'tenant-a' }],
      productOptions: [{ id: 'opt-x', product_id: 'prod-missing', restaurant_id: 'tenant-a', price: 1000 }],
      discounts: []
    }
  }), /OPTION_PRODUCT_NOT_FOUND/);
});
