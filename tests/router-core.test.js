import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeHostname,
  normalizeBasePath,
  isReservedPlatformHostname,
  assertSafeStaticPath,
  buildStaticTarget
} from '../cloudflare/router-core.js';

test('router normalizes hostnames and base path', () => {
  assert.equal(normalizeHostname(' Coffee.RESTBR.com. '), 'coffee.restbr.com');
  assert.equal(normalizeBasePath('/restbr-gold/'), '/restbr-gold');
  assert.equal(normalizeBasePath('/'), '');
});

test('platform and admin hosts are reserved', () => {
  assert.equal(isReservedPlatformHostname('restbr.com'), true);
  assert.equal(isReservedPlatformHostname('www.restbr.com'), true);
  assert.equal(isReservedPlatformHostname('admin.restbr.com'), true);
  assert.equal(isReservedPlatformHostname('coffee.restbr.com'), false);
});

test('static target maps custom-domain root to one shared Gold origin', () => {
  const target = buildStaticTarget('https://coffee.restbr.com/?cb=123');
  assert.equal(target.origin, 'https://hamodybr.github.io');
  assert.equal(target.pathname, '/restbr-gold/');
  assert.equal(target.search, '?cb=123');
});

test('static target maps asset paths without tenant query injection', () => {
  const target = buildStaticTarget('https://coffee.restbr.com/src/bootstrap/public-bootstrap.js?v=1');
  assert.equal(target.pathname, '/restbr-gold/src/bootstrap/public-bootstrap.js');
  assert.equal(target.searchParams.get('v'), '1');
  assert.equal(target.searchParams.has('rid'), false);
  assert.equal(target.searchParams.has('tenant'), false);
});

test('unsafe encoded traversal-like paths are rejected', () => {
  assert.throws(() => assertSafeStaticPath('/%2e%2e/secret'), /STATIC_PATH_UNSAFE_ENCODING/);
  assert.throws(() => assertSafeStaticPath('/assets/%2fsecret'), /STATIC_PATH_UNSAFE_ENCODING/);
  assert.throws(() => assertSafeStaticPath('/assets/%5csecret'), /STATIC_PATH_UNSAFE_ENCODING/);
});
