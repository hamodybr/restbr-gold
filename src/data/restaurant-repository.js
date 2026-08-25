import { normalizePublicMenuBundle } from './public-menu-model.js';

function assertAdapter(adapter) {
  if (!adapter || typeof adapter.resolveTenant !== 'function' || typeof adapter.loadPublicMenu !== 'function') {
    throw new Error('RESTAURANT_DATA_ADAPTER_INVALID');
  }
  return adapter;
}

export function createRestaurantRepository({ adapter }) {
  const dataAdapter = assertAdapter(adapter);

  return Object.freeze({
    async resolveDomain(request) {
      return dataAdapter.resolveTenant(request);
    },

    async getPublicMenu(tenant) {
      const payload = await dataAdapter.loadPublicMenu({ tenant });
      return normalizePublicMenuBundle({ tenant, payload });
    }
  });
}
