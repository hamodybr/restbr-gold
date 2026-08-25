import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSupabaseRestAdapter,
  SupabaseRestAdapterInternals
} from '../src/data/adapters/supabase-rest-adapter.js';

function response(rows, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return rows; }
  };
}

test('subdomain resolution requires exact verified active domain', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    const text = String(url);
    if (text.includes('/restaurant_domains?')) {
      return response([{ restaurant_id: 'r1', hostname: 'coffee.restbr.com', status: 'active', is_verified: true }]);
    }
    if (text.includes('/restaurants?')) {
      return response([{ id: 'r1', slug: 'coffee', status: 'active' }]);
    }
    throw new Error(`Unexpected URL: ${text}`);
  };

  const adapter = createSupabaseRestAdapter({
    fetchImpl,
    platform: { supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', requestTimeoutMs: 1000 }
  });

  const tenant = await adapter.resolveTenant({
    hostname: 'coffee.restbr.com',
    slug: 'coffee',
    source: 'subdomain'
  });

  assert.deepEqual(tenant, { restaurantId: 'r1', slug: 'coffee' });
  assert.match(seen[0], /restaurant_domains/);
  assert.match(seen[0], /hostname=eq\.coffee\.restbr\.com/);
  assert.match(seen[0], /status=eq\.active/);
  assert.match(seen[0], /is_verified=eq\.true/);
});

test('every public menu table request carries explicit restaurant_id scope', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(String(url));
    seen.push(parsed);
    const table = parsed.pathname.split('/').pop();

    if (table === 'restaurants') return response([{ id: 'r1', slug: 'coffee', status: 'active', currency: 'IQD' }]);
    if (table === 'restaurant_settings') return response([{ restaurant_id: 'r1', name_ar: 'Coffee' }]);
    if (table === 'categories') return response([{ id: 'c1', restaurant_id: 'r1', name_ar: 'Drinks', sort_order: 1 }]);
    if (table === 'products') return response([{ id: 'p1', restaurant_id: 'r1', category_id: 'c1', name_ar: 'Coffee', sort_order: 1 }]);
    if (table === 'product_options') return response([{ id: 'o1', restaurant_id: 'r1', product_id: 'p1', name_ar: 'Regular', price: 1000, sort_order: 1 }]);
    if (table === 'discounts') return response([]);
    throw new Error(`Unexpected table: ${table}`);
  };

  const adapter = createSupabaseRestAdapter({
    fetchImpl,
    platform: { supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', requestTimeoutMs: 1000 }
  });

  await adapter.loadPublicMenu({ tenant: { restaurantId: 'r1', slug: 'coffee' } });

  const tenantTables = new Set(['restaurant_settings', 'categories', 'products', 'product_options', 'discounts']);
  for (const url of seen) {
    const table = url.pathname.split('/').pop();
    if (!tenantTables.has(table)) continue;
    assert.equal(url.searchParams.get('restaurant_id'), 'eq.r1', `${table} must be tenant scoped`);
  }
});

test('settings aliases are normalized only inside adapter', () => {
  const mapped = SupabaseRestAdapterInternals.normalizeSettings({
    restaurant_name_ar: 'Legacy Name',
    name_ar: 'Canonical Name',
    whatsapp_number: '9647000000000',
    background_video: 'legacy.mp4',
    location_url: 'https://maps.example/test',
    announcement_enabled: false,
    announcement_ar: 'hidden'
  }, { name: 'Restaurant', currency: 'IQD' });

  assert.equal(mapped.name_ar, 'Canonical Name');
  assert.equal(mapped.whatsapp, '9647000000000');
  assert.equal(mapped.background_video_url, 'legacy.mp4');
  assert.equal(mapped.location, 'https://maps.example/test');
  assert.equal(mapped.announcement_ar, '');
  assert.equal(mapped.currency, 'IQD');
  assert.equal('restaurant_name_ar' in mapped, false);
  assert.equal('whatsapp_number' in mapped, false);
  assert.equal('background_video' in mapped, false);
});
