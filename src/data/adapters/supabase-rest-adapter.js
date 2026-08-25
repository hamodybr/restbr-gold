import { RESTBR_PLATFORM } from '../../config/platform.js';

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeSettings(row = {}, restaurant = {}) {
  const {
    restaurant_name_ar,
    restaurant_name_ku,
    restaurant_name_en,
    whatsapp_number,
    background_video,
    ...clean
  } = row;

  const announcementEnabled = row.announcement_enabled !== false;

  return {
    ...clean,
    name_ar: firstText(row.name_ar, restaurant_name_ar, restaurant.name),
    name_ku: firstText(row.name_ku, restaurant_name_ku, row.name_ar, restaurant_name_ar, restaurant.name),
    name_en: firstText(row.name_en, restaurant_name_en, restaurant.name),
    whatsapp: firstText(row.whatsapp, whatsapp_number),
    location: firstText(row.location_url, row.location),
    background_video_url: firstText(row.background_video_url, background_video),
    currency: firstText(row.currency, restaurant.currency, 'IQD'),
    announcement_ar: announcementEnabled ? firstText(row.announcement_ar) : '',
    announcement_ku: announcementEnabled ? firstText(row.announcement_ku) : '',
    announcement_en: announcementEnabled ? firstText(row.announcement_en) : ''
  };
}

function normalizeCategory(row = {}) {
  return {
    ...row,
    effect: firstText(row.effect, row.metadata?.effect, row.metadata?.card_effect)
  };
}

function normalizeProduct(row = {}) {
  return {
    ...row,
    badge: firstText(row.badge, row.metadata?.badge)
  };
}

function createUrl(baseUrl, table, params) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

export function createSupabaseRestAdapter({
  fetchImpl = globalThis.fetch,
  platform = RESTBR_PLATFORM
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('FETCH_IMPLEMENTATION_REQUIRED');

  const baseUrl = String(platform?.supabaseUrl || '').trim();
  const publishableKey = String(platform?.publishableKey || '').trim();
  const timeoutMs = Number(platform?.requestTimeoutMs || 8000);

  if (!baseUrl || !publishableKey) throw new Error('SUPABASE_PUBLIC_CONFIG_REQUIRED');

  async function requestRows(table, params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(createUrl(baseUrl, table, params), {
        method: 'GET',
        headers: {
          apikey: publishableKey,
          accept: 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`SUPABASE_${String(table).toUpperCase()}_HTTP_${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error(`SUPABASE_${String(table).toUpperCase()}_INVALID_RESPONSE`);
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`SUPABASE_${String(table).toUpperCase()}_TIMEOUT`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function resolveRestaurantById(restaurantId) {
    const rows = await requestRows('restaurants', {
      select: 'id,name,slug,status,default_language,timezone,currency,logo_url',
      id: `eq.${restaurantId}`,
      status: 'eq.active',
      limit: 1
    });
    return rows[0] || null;
  }

  return Object.freeze({
    async resolveTenant({ hostname, slug, source }) {
      if (source === 'development' && slug) {
        const rows = await requestRows('restaurants', {
          select: 'id,slug,status',
          slug: `eq.${slug}`,
          status: 'eq.active',
          limit: 1
        });
        const restaurant = rows[0];
        if (!restaurant) throw new Error('TENANT_NOT_FOUND');
        return { restaurantId: restaurant.id, slug: restaurant.slug };
      }

      const domainRows = await requestRows('restaurant_domains', {
        select: 'restaurant_id,hostname,status,is_verified',
        hostname: `eq.${hostname}`,
        status: 'eq.active',
        is_verified: 'eq.true',
        limit: 1
      });

      const domain = domainRows[0];
      if (!domain) throw new Error('TENANT_DOMAIN_NOT_FOUND');

      const restaurant = await resolveRestaurantById(domain.restaurant_id);
      if (!restaurant) throw new Error('TENANT_NOT_FOUND');

      return { restaurantId: restaurant.id, slug: restaurant.slug };
    },

    async loadPublicMenu({ tenant }) {
      const restaurantId = String(tenant?.restaurantId || '').trim();
      if (!restaurantId) throw new Error('TENANT_ID_REQUIRED_FOR_SUPABASE_LOAD');

      const [restaurantRows, settingsRows, categories, products, productOptions, discounts] = await Promise.all([
        requestRows('restaurants', {
          select: 'id,name,slug,status,default_language,timezone,currency,logo_url',
          id: `eq.${restaurantId}`,
          status: 'eq.active',
          limit: 1
        }),
        requestRows('restaurant_settings', {
          select: '*',
          restaurant_id: `eq.${restaurantId}`,
          limit: 1
        }),
        requestRows('categories', {
          select: '*',
          restaurant_id: `eq.${restaurantId}`,
          is_visible: 'eq.true',
          is_active: 'eq.true',
          order: 'sort_order.asc'
        }),
        requestRows('products', {
          select: '*',
          restaurant_id: `eq.${restaurantId}`,
          is_visible: 'eq.true',
          is_active: 'eq.true',
          order: 'sort_order.asc'
        }),
        requestRows('product_options', {
          select: '*',
          restaurant_id: `eq.${restaurantId}`,
          is_active: 'eq.true',
          order: 'sort_order.asc'
        }),
        requestRows('discounts', {
          select: '*',
          restaurant_id: `eq.${restaurantId}`,
          is_active: 'eq.true',
          order: 'created_at.asc'
        })
      ]);

      const restaurant = restaurantRows[0];
      if (!restaurant) throw new Error('TENANT_NOT_FOUND');

      return {
        restaurant,
        settings: normalizeSettings(settingsRows[0] || {}, restaurant),
        categories: categories.map(normalizeCategory),
        products: products.map(normalizeProduct),
        productOptions,
        discounts
      };
    }
  });
}

export const supabaseRestAdapter = createSupabaseRestAdapter();

export const SupabaseRestAdapterInternals = Object.freeze({
  normalizeSettings,
  normalizeCategory,
  normalizeProduct,
  createUrl
});
