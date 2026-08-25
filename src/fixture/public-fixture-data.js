export const FIXTURE_TENANT = Object.freeze({
  restaurantId: '00000000-0000-4000-8000-000000000001',
  slug: 'gold-demo'
});

export const PUBLIC_FIXTURE_DATA = Object.freeze({
  settings: {
    name_ar: 'مطعم الاختيار الذهبي',
    name_ku: 'رێستورانتا هەلبژارتنا زێڕین',
    name_en: 'GOLD RESTAURANT',
    subtitle_ar: 'أهلاً وسهلاً بكم',
    subtitle_ku: 'ب خێر هاتن',
    subtitle_en: 'Welcome',
    phone: '+9647500000000',
    whatsapp: '+9647500000000',
    currency: 'IQD',
    location: '#',
    address_ar: 'دهوك • كوردستان',
    address_ku: 'دهۆك • كوردستان',
    address_en: 'Duhok • Kurdistan',
    announcement_ar: 'أهلاً وسهلاً بكم في مطعم الاختيار الذهبي',
    announcement_ku: 'ب خێر هاتن بۆ رێستورانتا هەلبژارتنا زێڕین',
    announcement_en: 'Welcome to Gold Restaurant'
  },
  categories: [
    { id: 'cat-grill', slug: 'grill', name_ar: 'المشاوي', name_ku: 'برژاندی', name_en: 'Grill', effect: 'sm-grill-card', sort_order: 1 },
    { id: 'cat-western', slug: 'western', name_ar: 'الوجبات الغربية', name_ku: 'خوارنێن رۆژئاڤایی', name_en: 'Western', effect: 'sm-burger-card', sort_order: 2 },
    { id: 'cat-drinks', slug: 'drinks', name_ar: 'المشروبات الباردة', name_ku: 'ڤەخوارنێن سار', name_en: 'Cold Drinks', effect: 'sm-cold-card', sort_order: 3 }
  ],
  products: [
    {
      id: 'prod-chicken', category_id: 'cat-grill', sort_order: 1, badge: 'popular',
      name_ar: 'دجاج ذهبي', name_ku: 'مریشکێ زێڕین', name_en: 'Gold Chicken',
      options: [
        { id: 'opt-chicken-regular', name_ar: 'عادي', name_ku: 'ئاسایی', name_en: 'Regular', price: 10000, takeaway_price: 11000 },
        { id: 'opt-chicken-family', name_ar: 'عائلي', name_ku: 'خێزانی', name_en: 'Family', price: 18000, takeaway_price: 20000 }
      ]
    },
    {
      id: 'prod-burger', category_id: 'cat-western', sort_order: 1, badge: 'hot',
      name_ar: 'بركر ذهبي', name_ku: 'بەرگەرێ زێڕین', name_en: 'Gold Burger',
      options: [
        { id: 'opt-burger', name_ar: 'وجبة', name_ku: 'ژەم', name_en: 'Meal', price: 7000, takeaway_price: 7500 }
      ]
    },
    {
      id: 'prod-coffee', category_id: 'cat-drinks', sort_order: 1,
      name_ar: 'آيس كوفي', name_ku: 'ئایس کۆفی', name_en: 'Iced Coffee',
      options: [
        { id: 'opt-coffee-medium', name_ar: 'وسط', name_ku: 'ناڤنجی', name_en: 'Medium', price: 4000, takeaway_price: 4500 },
        { id: 'opt-coffee-large', name_ar: 'كبير', name_ku: 'مەزن', name_en: 'Large', price: 5000, takeaway_price: 5500 }
      ]
    },
    {
      id: 'prod-mojito', category_id: 'cat-drinks', sort_order: 2,
      name_ar: 'موهيتو', name_ku: 'مۆهیتۆ', name_en: 'Mojito',
      options: [
        { id: 'opt-mojito', name_ar: 'عادي', name_ku: 'ئاسایی', name_en: 'Regular', price: 4500, takeaway_price: 5000 }
      ]
    }
  ],
  discounts: [
    { id: 'disc-chicken', discount_percent: 10, price_mode: 'both', scope_type: 'product', target_id: 'prod-chicken', is_active: true },
    { id: 'disc-drinks', discount_percent: 15, price_mode: 'dine_in', scope_type: 'category', target_id: 'cat-drinks', is_active: true }
  ]
});
