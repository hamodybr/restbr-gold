import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../cloudflare/restbr-gold-router-v1-standalone.js';

const env = {
  SUPABASE_URL: 'https://platform.example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'public-key',
  STATIC_ORIGIN: 'https://hamodybr.github.io',
  STATIC_BASE_PATH: '/restbr-gold'
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function installFetchMock({ domainFound = true } = {}) {
  const seen = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || String(input));
    seen.push({ url, init });

    if (url.hostname === 'platform.example.supabase.co') {
      const table = url.pathname.split('/').pop();
      if (table === 'restaurant_domains') {
        return jsonResponse(domainFound ? [{ restaurant_id: 'r1', hostname: 'coffee.restbr.com', status: 'active', is_verified: true }] : []);
      }
      if (table === 'restaurants') {
        return jsonResponse([{ id: 'r1', name: 'Coffee', slug: 'coffee', status: 'active' }]);
      }
    }

    if (url.hostname === 'hamodybr.github.io') {
      const type = url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html';
      return new Response(type === 'text/html' ? '<!doctype html><title>Gold</title>' : 'export const ok = true;', {
        status: 200,
        headers: { 'content-type': `${type}; charset=utf-8` }
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  return { seen, restore() { globalThis.fetch = originalFetch; } };
}

test('standalone workers.dev endpoint is safe and does not require bindings', async () => {
  const response = await worker.fetch(new Request('https://restbr-gold-staging.example.workers.dev/'), {}, {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, 'restbr-gold-router');
  assert.equal(body.version, 'gold-v1');
});

test('standalone verified host proxies to shared Gold origin', async () => {
  const mock = installFetchMock();
  try {
    const response = await worker.fetch(new Request('https://coffee.restbr.com/'), env, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-restbr-router'), 'gold-v1');
    assert.equal(response.headers.get('x-restbr-restaurant'), 'coffee');
    const staticFetch = mock.seen.find((entry) => entry.url.hostname === 'hamodybr.github.io');
    assert.ok(staticFetch);
    assert.equal(staticFetch.url.pathname, '/restbr-gold/');
  } finally {
    mock.restore();
  }
});

test('standalone asset proxy preserves query but never injects tenant selectors', async () => {
  const mock = installFetchMock();
  try {
    const response = await worker.fetch(new Request('https://coffee.restbr.com/src/bootstrap/public-bootstrap.js?v=7'), env, {});
    assert.equal(response.status, 200);
    const staticFetch = mock.seen.find((entry) => entry.url.hostname === 'hamodybr.github.io');
    assert.equal(staticFetch.url.pathname, '/restbr-gold/src/bootstrap/public-bootstrap.js');
    assert.equal(staticFetch.url.searchParams.get('v'), '7');
    assert.equal(staticFetch.url.searchParams.has('rid'), false);
    assert.equal(staticFetch.url.searchParams.has('tenant'), false);
  } finally {
    mock.restore();
  }
});

test('standalone unknown host fails closed', async () => {
  const mock = installFetchMock({ domainFound: false });
  try {
    const response = await worker.fetch(new Request('https://missing.restbr.com/'), env, {});
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error, 'restaurant_not_found');
    assert.equal(mock.seen.some((entry) => entry.url.hostname === 'hamodybr.github.io'), false);
  } finally {
    mock.restore();
  }
});
