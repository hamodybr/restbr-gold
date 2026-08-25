import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../cloudflare/restbr-gold-router-v1.js';

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
        return jsonResponse(domainFound ? [{
          restaurant_id: 'r1',
          hostname: 'coffee.restbr.com',
          status: 'active',
          is_verified: true
        }] : []);
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

  return {
    seen,
    restore() { globalThis.fetch = originalFetch; }
  };
}

test('verified restaurant host proxies root to shared Gold app', async () => {
  const mock = installFetchMock();
  try {
    const response = await worker.fetch(new Request('https://coffee.restbr.com/'), env, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-restbr-router'), 'gold-v1');
    assert.equal(response.headers.get('x-restbr-restaurant'), 'coffee');
    assert.equal(response.headers.get('cache-control'), 'no-store');

    const staticFetch = mock.seen.find((entry) => entry.url.hostname === 'hamodybr.github.io');
    assert.ok(staticFetch);
    assert.equal(staticFetch.url.pathname, '/restbr-gold/');
  } finally {
    mock.restore();
  }
});

test('asset request is proxied to the same shared static base without injected tenant selectors', async () => {
  const mock = installFetchMock();
  try {
    const response = await worker.fetch(
      new Request('https://coffee.restbr.com/src/bootstrap/public-bootstrap.js?v=7'),
      env,
      {}
    );
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

test('unknown restaurant host fails closed before static origin fetch', async () => {
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

test('health endpoint returns resolved restaurant without serving static HTML', async () => {
  const mock = installFetchMock();
  try {
    const response = await worker.fetch(new Request('https://coffee.restbr.com/_restbr/health'), env, {});
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.restaurant.id, 'r1');
    assert.equal(body.restaurant.slug, 'coffee');
    assert.equal(mock.seen.some((entry) => entry.url.hostname === 'hamodybr.github.io'), false);
  } finally {
    mock.restore();
  }
});

test('reserved platform hosts are never handled as restaurants', async () => {
  const response = await worker.fetch(new Request('https://admin.restbr.com/'), {}, {});
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error, 'host_not_handled');
});
