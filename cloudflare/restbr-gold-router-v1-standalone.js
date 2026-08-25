// RESTBR Gold Router V1 — standalone Cloudflare Worker
// Same contract as cloudflare/restbr-gold-router-v1.js + router-core.js,
// bundled into one file for safe manual staging deployment.

const ROUTER_VERSION = 'gold-v1';
const DEFAULT_STATIC_ORIGIN = 'https://hamodybr.github.io';
const DEFAULT_STATIC_BASE_PATH = '/restbr-gold';
const PLATFORM_ROOT = 'restbr.com';
const POSITIVE_ROUTE_CACHE_SECONDS = 60;

function normalizeHostname(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

function normalizeBasePath(value = '') {
  const text = String(value || '').trim();
  if (!text || text === '/') return '';
  return `/${text.replace(/^\/+|\/+$/g, '')}`;
}

function isReservedPlatformHostname(hostname, platformRoot = PLATFORM_ROOT) {
  const host = normalizeHostname(hostname);
  const root = normalizeHostname(platformRoot);
  return host === root || host === `www.${root}` || host === `admin.${root}`;
}

function assertSafeStaticPath(pathname) {
  const path = String(pathname || '/');
  if (!path.startsWith('/')) throw new Error('STATIC_PATH_MUST_BE_ABSOLUTE');
  if (/%(?:2e|2f|5c)/i.test(path)) throw new Error('STATIC_PATH_UNSAFE_ENCODING');
  if (path.includes('\\') || path.includes('\0')) throw new Error('STATIC_PATH_UNSAFE_CHARACTER');
  return path;
}

function buildStaticTarget(requestUrl, {
  staticOrigin = DEFAULT_STATIC_ORIGIN,
  staticBasePath = DEFAULT_STATIC_BASE_PATH
} = {}) {
  const incoming = new URL(requestUrl);
  const origin = new URL(String(staticOrigin || DEFAULT_STATIC_ORIGIN));
  const basePath = normalizeBasePath(staticBasePath);
  const publicPath = assertSafeStaticPath(incoming.pathname);
  const joinedPath = `${basePath}${publicPath === '/' ? '/' : publicPath}` || '/';

  origin.pathname = joinedPath;
  origin.search = incoming.search;
  origin.hash = '';

  if (basePath) {
    const allowedRoot = `${basePath}/`;
    if (origin.pathname !== allowedRoot && !origin.pathname.startsWith(allowedRoot)) {
      throw new Error('STATIC_PATH_ESCAPE');
    }
  }

  return origin;
}

function routeCacheKey(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) throw new Error('ROUTER_HOSTNAME_REQUIRED');
  return `https://restbr-gold-router-cache.invalid/route/${encodeURIComponent(host)}`;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function assertBindings(env) {
  if (!env?.SUPABASE_URL || !env?.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('ROUTER_SUPABASE_BINDINGS_REQUIRED');
  }
}

function supabaseBase(env) {
  return String(env.SUPABASE_URL).replace(/\/+$/, '');
}

async function supabaseRows(env, table, params = {}) {
  const url = new URL(`${supabaseBase(env)}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: String(env.SUPABASE_PUBLISHABLE_KEY),
      accept: 'application/json'
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });

  if (!response.ok) {
    throw new Error(`ROUTER_${String(table).toUpperCase()}_HTTP_${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`ROUTER_${String(table).toUpperCase()}_INVALID_RESPONSE`);
  return rows;
}

async function readRouteCache(hostname) {
  if (typeof caches === 'undefined' || !caches.default) return null;
  try {
    const cached = await caches.default.match(new Request(routeCacheKey(hostname)));
    if (!cached) return null;
    const data = await cached.json();
    return data?.restaurant || null;
  } catch {
    return null;
  }
}

async function writeRouteCache(hostname, restaurant, ctx) {
  if (typeof caches === 'undefined' || !caches.default || !restaurant) return;
  const task = caches.default.put(
    new Request(routeCacheKey(hostname)),
    new Response(JSON.stringify({ restaurant }), {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'cache-control': `public, max-age=${POSITIVE_ROUTE_CACHE_SECONDS}`
      }
    })
  );

  if (ctx?.waitUntil) ctx.waitUntil(task);
  else await task;
}

async function resolveRestaurant(hostname, env, ctx) {
  const cached = await readRouteCache(hostname);
  if (cached) return cached;

  const domains = await supabaseRows(env, 'restaurant_domains', {
    select: 'restaurant_id,hostname,status,is_verified',
    hostname: `eq.${hostname}`,
    status: 'eq.active',
    is_verified: 'eq.true',
    limit: 1
  });

  const domain = domains[0];
  if (!domain) return null;

  const restaurants = await supabaseRows(env, 'restaurants', {
    select: 'id,name,slug,status',
    id: `eq.${domain.restaurant_id}`,
    status: 'eq.active',
    limit: 1
  });

  const restaurant = restaurants[0] || null;
  if (restaurant) await writeRouteCache(hostname, restaurant, ctx);
  return restaurant;
}

function staticConfig(env) {
  return {
    staticOrigin: String(env?.STATIC_ORIGIN || DEFAULT_STATIC_ORIGIN),
    staticBasePath: String(env?.STATIC_BASE_PATH || DEFAULT_STATIC_BASE_PATH)
  };
}

async function proxyGoldStatic(request, restaurant, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD' });
  }

  const target = buildStaticTarget(request.url, staticConfig(env));
  const incomingHeaders = new Headers();
  for (const name of ['accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range']) {
    const value = request.headers.get(name);
    if (value) incomingHeaders.set(name, value);
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers: incomingHeaders,
    redirect: 'follow'
  });

  const headers = new Headers(upstream.headers);
  headers.set('x-restbr-router', ROUTER_VERSION);
  headers.set('x-restbr-restaurant', String(restaurant.slug || ''));
  headers.set('x-content-type-options', 'nosniff');

  const contentType = String(headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) headers.set('cache-control', 'no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const hostname = normalizeHostname(url.hostname);

      if (hostname.endsWith('.workers.dev')) {
        return json({ ok: true, service: 'restbr-gold-router', version: ROUTER_VERSION });
      }

      if (!hostname || isReservedPlatformHostname(hostname, PLATFORM_ROOT)) {
        return json({ ok: false, error: 'host_not_handled' }, 404);
      }

      assertBindings(env);
      const restaurant = await resolveRestaurant(hostname, env, ctx);
      if (!restaurant) return json({ ok: false, error: 'restaurant_not_found' }, 404);

      if (url.pathname === '/_restbr/health') {
        return json({
          ok: true,
          routerVersion: ROUTER_VERSION,
          hostname,
          restaurant: {
            id: restaurant.id,
            slug: restaurant.slug,
            status: restaurant.status
          }
        });
      }

      if (url.pathname.startsWith('/_restbr/')) {
        return json({ ok: false, error: 'endpoint_not_found' }, 404);
      }

      return proxyGoldStatic(request, restaurant, env);
    } catch (error) {
      console.error('RESTBR Gold Router error:', error);
      return json({ ok: false, error: 'router_internal_error' }, 500);
    }
  }
};
