function assertTenantId(tenantId) {
  const value = String(tenantId || '').trim();
  if (!value) throw new Error('TENANT_ID_REQUIRED_FOR_STORAGE');
  return value;
}

function assertKey(key) {
  const value = String(key || '').trim();
  if (!value) throw new Error('TENANT_STORAGE_KEY_REQUIRED');
  if (value.includes(':')) {
    throw new Error('TENANT_STORAGE_KEY_MUST_NOT_CONTAIN_COLON');
  }
  return value;
}

export function tenantStorageKey(tenantId, key, version = 1) {
  const tenant = assertTenantId(tenantId);
  const safeKey = assertKey(key);
  const safeVersion = Number.isInteger(version) && version > 0 ? version : 1;
  return `restbr:${tenant}:${safeKey}:v${safeVersion}`;
}

export function createTenantStorage({ tenantId, storage }) {
  const tenant = assertTenantId(tenantId);
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('WEB_STORAGE_IMPLEMENTATION_REQUIRED');
  }

  return Object.freeze({
    key(name, version = 1) {
      return tenantStorageKey(tenant, name, version);
    },

    get(name, version = 1) {
      return storage.getItem(tenantStorageKey(tenant, name, version));
    },

    set(name, value, version = 1) {
      storage.setItem(tenantStorageKey(tenant, name, version), String(value));
    },

    remove(name, version = 1) {
      storage.removeItem(tenantStorageKey(tenant, name, version));
    },

    getJSON(name, fallback = null, version = 1) {
      const raw = storage.getItem(tenantStorageKey(tenant, name, version));
      if (raw == null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    setJSON(name, value, version = 1) {
      storage.setItem(
        tenantStorageKey(tenant, name, version),
        JSON.stringify(value)
      );
    }
  });
}
