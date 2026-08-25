import assert from 'node:assert/strict';

import worker from '../cloudflare/restbr-gold-router-v1.js';

const env = {
  SUPABASE_URL: 'https://xdqewaapwhmqlfotaofg.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dOGkocLtn1WVvrxmu6TnJQ_8qyPyV-T',
  STATIC_ORIGIN: 'https://hamodybr.github.io',
  STATIC_BASE_PATH: '/restbr-gold'
};

const hostname = 'yourcoffee-test.restbr.com';
const expectedId = '2bc9d2b1-68f3-4969-81b3-ec5dade417b2';

const health = await worker.fetch(
  new Request(`https://${hostname}/_restbr/health`),
  env,
  {}
);

assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.restaurant.id, expectedId);
assert.equal(healthBody.restaurant.slug, 'yourcoffee-test');
assert.equal(healthBody.routerVersion, 'gold-v1');

const staticResponse = await worker.fetch(
  new Request(`https://${hostname}/?router_check=1`),
  env,
  {}
);

assert.equal(staticResponse.status, 200);
assert.equal(staticResponse.headers.get('x-restbr-router'), 'gold-v1');
assert.equal(staticResponse.headers.get('x-restbr-restaurant'), 'yourcoffee-test');
const html = await staticResponse.text();
assert.match(html, /<!doctype html>/i);

console.log(JSON.stringify({
  simulatedHost: hostname,
  resolvedRestaurantId: healthBody.restaurant.id,
  resolvedSlug: healthBody.restaurant.slug,
  routerVersion: healthBody.routerVersion,
  staticOrigin: env.STATIC_ORIGIN,
  staticBasePath: env.STATIC_BASE_PATH,
  staticStatus: staticResponse.status,
  cloudflareOrDnsChanged: false
}, null, 2));
