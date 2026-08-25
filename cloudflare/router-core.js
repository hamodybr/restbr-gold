export const ROUTER_VERSION = 'gold-v1';
export const DEFAULT_STATIC_ORIGIN = 'https://hamodybr.github.io';
export const DEFAULT_STATIC_BASE_PATH = '/restbr-gold';

export function normalizeHostname(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

export function normalizeBasePath(value = '') {
  const text = String(value || '').trim();
  if (!text || text === '/') return '';
  return `/${text.replace(/^\/+|\/+$/g, '')}`;
}

export function isReservedPlatformHostname(hostname, platformRoot = 'restbr.com') {
  const host = normalizeHostname(hostname);
  const root = normalizeHostname(platformRoot);
  return host === root || host === `www.${root}` || host === `admin.${root}`;
}

export function assertSafeStaticPath(pathname) {
  const path = String(pathname || '/');
  if (!path.startsWith('/')) throw new Error('STATIC_PATH_MUST_BE_ABSOLUTE');

  // Do not allow encoded dot segments or encoded slashes/backslashes to be
  // interpreted differently by the upstream static origin.
  if (/%(?:2e|2f|5c)/i.test(path)) {
    throw new Error('STATIC_PATH_UNSAFE_ENCODING');
  }

  if (path.includes('\\') || path.includes('\0')) {
    throw new Error('STATIC_PATH_UNSAFE_CHARACTER');
  }

  return path;
}

export function buildStaticTarget(requestUrl, {
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

export function routeCacheKey(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) throw new Error('ROUTER_HOSTNAME_REQUIRED');
  return `https://restbr-gold-router-cache.invalid/route/${encodeURIComponent(host)}`;
}
