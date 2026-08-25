function normalizeHostname(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
}

export function isPreviewHostname(hostname) {
  const host = normalizeHostname(hostname);
  return host === 'hamodybr.github.io' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.localhost');
}

export function selectPublicAdapter({ hostname, fixtureAdapter, productionAdapter }) {
  if (!fixtureAdapter || !productionAdapter) {
    throw new Error('PUBLIC_ADAPTERS_REQUIRED');
  }

  return isPreviewHostname(hostname) ? fixtureAdapter : productionAdapter;
}

export const PublicAdapterSelectorInternals = Object.freeze({ normalizeHostname });
