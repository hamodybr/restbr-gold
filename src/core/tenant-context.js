const DEFAULT_PLATFORM_DOMAIN = 'restbr.com';

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

function isLocalHostname(hostname) {
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost');
}

function getSubdomainSlug(hostname, platformDomain) {
  if (!hostname.endsWith(`.${platformDomain}`)) return null;
  const suffixLength = platformDomain.length + 1;
  const prefix = hostname.slice(0, -suffixLength);
  if (!prefix || prefix.includes('.')) return null;
  return prefix;
}

/**
 * Resolve immutable tenant context.
 *
 * Production identity is hostname-based. A dev-only `?tenant=` selector is
 * accepted only on localhost so production can never trust URL restaurant IDs.
 *
 * @param {object} options
 * @param {string} options.hostname
 * @param {(request: {hostname: string, slug: string|null, source: string}) => Promise<object>} options.resolveDomain
 * @param {string} [options.platformDomain]
 * @param {string} [options.search]
 * @returns {Promise<Readonly<{restaurantId:string,slug:string,hostname:string,source:string}>>}
 */
export async function resolveTenantContext({
  hostname,
  resolveDomain,
  platformDomain = DEFAULT_PLATFORM_DOMAIN,
  search = ''
}) {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedPlatformDomain = normalizeHostname(platformDomain);

  if (!normalizedHostname) {
    throw new Error('TENANT_HOSTNAME_REQUIRED');
  }

  if (typeof resolveDomain !== 'function') {
    throw new Error('TENANT_RESOLVER_REQUIRED');
  }

  let source = 'custom-domain';
  let slug = getSubdomainSlug(normalizedHostname, normalizedPlatformDomain);

  if (slug) {
    source = 'subdomain';
  } else if (isLocalHostname(normalizedHostname)) {
    source = 'development';
    const params = new URLSearchParams(search || '');
    slug = String(params.get('tenant') || '').trim().toLowerCase() || null;
  }

  const resolved = await resolveDomain({
    hostname: normalizedHostname,
    slug,
    source
  });

  const restaurantId = String(resolved?.restaurantId || '').trim();
  const resolvedSlug = String(resolved?.slug || slug || '').trim().toLowerCase();

  if (!restaurantId || !resolvedSlug) {
    throw new Error('TENANT_NOT_FOUND');
  }

  return Object.freeze({
    restaurantId,
    slug: resolvedSlug,
    hostname: normalizedHostname,
    source
  });
}

export const TenantContextInternals = Object.freeze({
  normalizeHostname,
  isLocalHostname,
  getSubdomainSlug
});
