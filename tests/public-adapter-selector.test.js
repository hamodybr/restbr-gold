import test from 'node:test';
import assert from 'node:assert/strict';

import { isPreviewHostname, selectPublicAdapter } from '../src/bootstrap/public-adapter-selector.js';

const fixture = Object.freeze({ name: 'fixture' });
const production = Object.freeze({ name: 'production' });

test('GitHub Pages and localhost are preview-only hosts', () => {
  assert.equal(isPreviewHostname('hamodybr.github.io'), true);
  assert.equal(isPreviewHostname('LOCALHOST'), true);
  assert.equal(isPreviewHostname('menu.localhost'), true);
  assert.equal(isPreviewHostname('127.0.0.1'), true);
});

test('RESTBR subdomains and custom domains are production hosts', () => {
  assert.equal(isPreviewHostname('yourcoffee-test.restbr.com'), false);
  assert.equal(isPreviewHostname('restaurant.example.com'), false);
});

test('selector never serves fixture on production restaurant host', () => {
  const selected = selectPublicAdapter({
    hostname: 'yourcoffee-test.restbr.com',
    fixtureAdapter: fixture,
    productionAdapter: production
  });
  assert.equal(selected, production);
});

test('selector keeps GitHub Pages isolated from live restaurant data', () => {
  const selected = selectPublicAdapter({
    hostname: 'hamodybr.github.io',
    fixtureAdapter: fixture,
    productionAdapter: production
  });
  assert.equal(selected, fixture);
});
