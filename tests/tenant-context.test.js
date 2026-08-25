import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveTenantContext,
  TenantContextInternals
} from '../src/core/tenant-context.js';

import {
  tenantStorageKey,
  createTenantStorage
} from '../src/core/tenant-storage.js';

test('normalizes hostnames', () => {
  assert.equal(
    TenantContextInternals.normalizeHostname(' Coffee.RESTBR.com. '),
    'coffee.restbr.com'
  );
});

test('extracts one-level RESTBR subdomain slug', () => {
  assert.equal(
    TenantContextInternals.getSubdomainSlug('coffee.restbr.com', 'restbr.com'),
    'coffee'
  );
  assert.equal(
    TenantContextInternals.getSubdomainSlug('a.b.restbr.com', 'restbr.com'),
    null
  );
});

test('resolves production subdomain through explicit resolver', async () => {
  const context = await resolveTenantContext({
    hostname: 'coffee.restbr.com',
    resolveDomain: async request => {
      assert.deepEqual(request, {
        hostname: 'coffee.restbr.com',
        slug: 'coffee',
        source: 'subdomain'
      });
      return {
        restaurantId: 'restaurant-a',
        slug: 'coffee'
      };
    }
  });

  assert.deepEqual(context, {
    restaurantId: 'restaurant-a',
    slug: 'coffee',
    hostname: 'coffee.restbr.com',
    source: 'subdomain'
  });
  assert.equal(Object.isFrozen(context), true);
});

test('does not trust production query-string tenant selectors', async () => {
  let request;
  await resolveTenantContext({
    hostname: 'restaurant.example.com',
    search: '?tenant=evil&rid=restaurant-b',
    resolveDomain: async value => {
      request = value;
      return {
        restaurantId: 'restaurant-a',
        slug: 'restaurant-a'
      };
    }
  });

  assert.deepEqual(request, {
    hostname: 'restaurant.example.com',
    slug: null,
    source: 'custom-domain'
  });
});

test('allows localhost tenant slug only for development', async () => {
  const context = await resolveTenantContext({
    hostname: 'localhost',
    search: '?tenant=coffee&rid=ignored',
    resolveDomain: async request => {
      assert.equal(request.slug, 'coffee');
      assert.equal(request.source, 'development');
      return { restaurantId: 'restaurant-a', slug: 'coffee' };
    }
  });

  assert.equal(context.restaurantId, 'restaurant-a');
});

test('tenant storage keys cannot collide across restaurants', () => {
  assert.equal(
    tenantStorageKey('restaurant-a', 'cart'),
    'restbr:restaurant-a:cart:v1'
  );
  assert.notEqual(
    tenantStorageKey('restaurant-a', 'cart'),
    tenantStorageKey('restaurant-b', 'cart')
  );
});

test('tenant storage wrapper reads only its namespace', () => {
  const map = new Map();
  const storage = {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key)
  };

  const a = createTenantStorage({ tenantId: 'restaurant-a', storage });
  const b = createTenantStorage({ tenantId: 'restaurant-b', storage });

  a.setJSON('cart', [{ id: 1 }]);
  b.setJSON('cart', [{ id: 2 }]);

  assert.deepEqual(a.getJSON('cart'), [{ id: 1 }]);
  assert.deepEqual(b.getJSON('cart'), [{ id: 2 }]);
});
