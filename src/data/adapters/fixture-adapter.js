import { FIXTURE_TENANT, PUBLIC_FIXTURE_DATA } from '../../fixture/public-fixture-data.js';

function withTenant(row) {
  return { ...row, restaurant_id: FIXTURE_TENANT.restaurantId };
}

export const fixtureAdapter = Object.freeze({
  async resolveTenant() {
    return {
      restaurantId: FIXTURE_TENANT.restaurantId,
      slug: FIXTURE_TENANT.slug
    };
  },

  async loadPublicMenu({ tenant }) {
    if (tenant?.restaurantId !== FIXTURE_TENANT.restaurantId) {
      throw new Error('FIXTURE_TENANT_MISMATCH');
    }

    const products = PUBLIC_FIXTURE_DATA.products.map(({ options: _options, ...product }) => withTenant(product));
    const productOptions = PUBLIC_FIXTURE_DATA.products.flatMap((product) =>
      product.options.map((option, index) => withTenant({
        ...option,
        product_id: product.id,
        sort_order: index + 1
      }))
    );

    return {
      restaurant: {
        id: FIXTURE_TENANT.restaurantId,
        slug: FIXTURE_TENANT.slug,
        status: 'active'
      },
      settings: withTenant(PUBLIC_FIXTURE_DATA.settings),
      categories: PUBLIC_FIXTURE_DATA.categories.map(withTenant),
      products,
      productOptions,
      discounts: PUBLIC_FIXTURE_DATA.discounts.map(withTenant)
    };
  }
});
