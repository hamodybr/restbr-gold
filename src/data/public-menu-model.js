function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function asId(value, code) {
  const id = String(value || '').trim();
  if (!id) throw new Error(code);
  return id;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function assertTenantRows(rows, tenantId, label) {
  for (const row of rows) {
    if (row?.restaurant_id == null) continue;
    if (String(row.restaurant_id) !== tenantId) {
      throw new Error(`CROSS_TENANT_${label}_ROW`);
    }
  }
}

function stripTenantField(row = {}) {
  const { restaurant_id: _restaurantId, ...rest } = row;
  return rest;
}

function normalizeOption(row, productId) {
  const clean = stripTenantField(row);
  return {
    ...clean,
    id: asId(clean.id, 'OPTION_ID_REQUIRED'),
    product_id: productId,
    price: asNumber(clean.price),
    takeaway_price: clean.takeaway_price == null ? null : asNumber(clean.takeaway_price)
  };
}

export function normalizePublicMenuBundle({ tenant, payload }) {
  const tenantId = asId(tenant?.restaurantId, 'TENANT_ID_REQUIRED_FOR_MENU');
  const tenantSlug = asId(tenant?.slug, 'TENANT_SLUG_REQUIRED_FOR_MENU');
  const source = payload || {};

  const restaurant = source.restaurant || {};
  if (restaurant.id != null && String(restaurant.id) !== tenantId) {
    throw new Error('CROSS_TENANT_RESTAURANT_ROW');
  }

  const settingsRows = Array.isArray(source.settings) ? source.settings : [source.settings || {}];
  const categoriesRows = toArray(source.categories);
  const productsRows = toArray(source.products);
  const optionRows = toArray(source.productOptions || source.product_options);
  const discountRows = toArray(source.discounts);

  assertTenantRows(settingsRows, tenantId, 'SETTINGS');
  assertTenantRows(categoriesRows, tenantId, 'CATEGORY');
  assertTenantRows(productsRows, tenantId, 'PRODUCT');
  assertTenantRows(optionRows, tenantId, 'OPTION');
  assertTenantRows(discountRows, tenantId, 'DISCOUNT');

  const settings = stripTenantField(settingsRows[0] || {});

  const categories = categoriesRows
    .map((row) => {
      const clean = stripTenantField(row);
      return {
        ...clean,
        id: asId(clean.id, 'CATEGORY_ID_REQUIRED'),
        sort_order: asNumber(clean.sort_order)
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const categoryIds = new Set(categories.map((row) => row.id));
  const optionsByProduct = new Map();

  for (const row of optionRows) {
    const productId = asId(row.product_id, 'OPTION_PRODUCT_ID_REQUIRED');
    const list = optionsByProduct.get(productId) || [];
    list.push(normalizeOption(row, productId));
    optionsByProduct.set(productId, list);
  }

  const products = productsRows
    .map((row) => {
      const clean = stripTenantField(row);
      const id = asId(clean.id, 'PRODUCT_ID_REQUIRED');
      const categoryId = asId(clean.category_id, 'PRODUCT_CATEGORY_ID_REQUIRED');
      if (!categoryIds.has(categoryId)) throw new Error('PRODUCT_CATEGORY_NOT_FOUND');

      const nestedOptions = toArray(clean.options).map((option) => normalizeOption(option, id));
      const normalizedOptions = (optionsByProduct.get(id) || nestedOptions)
        .sort((a, b) => asNumber(a.sort_order) - asNumber(b.sort_order));

      const { options: _options, ...withoutNestedOptions } = clean;
      return {
        ...withoutNestedOptions,
        id,
        category_id: categoryId,
        sort_order: asNumber(clean.sort_order),
        options: normalizedOptions
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const productIds = new Set(products.map((row) => row.id));
  for (const productId of optionsByProduct.keys()) {
    if (!productIds.has(productId)) throw new Error('OPTION_PRODUCT_NOT_FOUND');
  }

  const discounts = discountRows.map((row) => {
    const clean = stripTenantField(row);
    return {
      ...clean,
      id: asId(clean.id, 'DISCOUNT_ID_REQUIRED'),
      discount_percent: asNumber(clean.discount_percent),
      is_active: clean.is_active !== false
    };
  });

  return deepFreeze({
    tenant: {
      restaurantId: tenantId,
      slug: tenantSlug,
      hostname: String(tenant.hostname || ''),
      source: String(tenant.source || '')
    },
    restaurant: {
      ...stripTenantField(restaurant),
      id: tenantId,
      slug: String(restaurant.slug || tenantSlug)
    },
    settings,
    categories,
    products,
    discounts
  });
}

export const PublicMenuModelInternals = Object.freeze({
  assertTenantRows,
  deepFreeze
});
