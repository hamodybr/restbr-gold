(() => {
  'use strict';

  const data = window.RESTBR_GOLD_FIXTURE;
  if (!data) throw new Error('RESTBR Gold fixture is missing.');

  const I18N = {
    ar: { location:'موقعنا', call:'اتصال', whatsapp:'واتساب منيو', popular:'الأكثر طلباً', hot:'حار 🌶', offer:'عرض', currency:'د.ع', search:'ابحث عن صنف...', searchResults:'نتائج البحث', noResults:'ما لقينا صنف مطابق', share:'مشاركة', copied:'تم نسخ الرابط', add:'إضافة للسلة', choose:'اختيار' },
    ku: { location:'شوێنی مە', call:'پەیوەندی', whatsapp:'مێنیوی واتساپ', popular:'زۆرترین داواکراو', hot:'توند 🌶', offer:'ئۆفەر', currency:'د.ع', search:'لێگەڕان بۆ بەرهەم...', searchResults:'ئەنجامی گەڕان', noResults:'هیچ بەرهەمێک نەدۆزرایەوە', share:'هاوبەشکردن', copied:'لینک کۆپی کرا', add:'زیادکردن بۆ سەبەتە', choose:'هەڵبژێرە' },
    en: { location:'Location', call:'Call', whatsapp:'WhatsApp Menu', popular:'Most Popular', hot:'Spicy 🌶', offer:'Offer', currency:'IQD', search:'Search menu...', searchResults:'Search results', noResults:'No matching items', share:'Share', copied:'Link copied', add:'Add to cart', choose:'Choose' }
  };

  const state = {
    lang: 'ar',
    mode: null,
    cart: [],
    activeCategory: data.categories[0]?.id || null,
    searchQuery: '',
    catsFixed: false,
    savedCatsX: 0
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  const local = (row, key) => row?.[`${key}_${state.lang}`] || row?.[`${key}_ar`] || row?.[`${key}_en`] || '';
  const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ${I18N[state.lang].currency}`;
  const normalizedMode = () => state.mode === 'dinein' ? 'dine_in' : state.mode;

  let revealObserver = null;

  function svgImage(label, tone = '#9f6b2d') {
    const safe = String(label || 'GOLD').replace(/[<>&"']/g, '').slice(0, 22);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><radialGradient id="g" cx="28%" cy="20%"><stop offset="0" stop-color="#efd28d"/><stop offset=".38" stop-color="${tone}"/><stop offset="1" stop-color="#120d08"/></radialGradient></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="450" cy="390" r="185" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="5"/><text x="450" y="405" text-anchor="middle" fill="#fff4d7" font-family="Arial" font-size="58" font-weight="800">${safe}</text><text x="450" y="490" text-anchor="middle" fill="#efc46f" font-family="Arial" font-size="26" letter-spacing="8">RESTBR GOLD</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  }

  function productMatchesSearch(product) {
    const q = normalizeSearchText(state.searchQuery);
    if (!q) return true;
    const category = data.categories.find((row) => row.id === product.category_id);
    const values = [product.name_ar, product.name_ku, product.name_en, category?.name_ar, category?.name_ku, category?.name_en, ...product.options.flatMap((option) => [option.name_ar, option.name_ku, option.name_en])];
    return normalizeSearchText(values.filter(Boolean).join(' ')).includes(q);
  }

  function activeDiscount(product) {
    const mode = normalizedMode();
    if (!mode) return null;
    let best = null;
    let rank = 0;
    data.discounts.forEach((row) => {
      if (!row.is_active || (row.price_mode !== 'both' && row.price_mode !== mode)) return;
      let currentRank = 0;
      if (row.scope_type === 'product' && row.target_id === product.id) currentRank = 3;
      else if (row.scope_type === 'category' && row.target_id === product.category_id) currentRank = 2;
      else if (row.scope_type === 'restaurant' || row.scope_type === 'all') currentRank = 1;
      if (currentRank && (currentRank > rank || (currentRank === rank && Number(row.discount_percent) > Number(best?.discount_percent || 0)))) {
        best = row;
        rank = currentRank;
      }
    });
    return best;
  }

  function optionPrice(product, option) {
    const base = state.mode === 'takeaway' ? Number(option.takeaway_price ?? option.price ?? 0) : Number(option.price || 0);
    const discount = activeDiscount(product);
    if (!discount) return { base, final: base, discount: null };
    return { base, final: Math.max(0, Math.round(base * (100 - Number(discount.discount_percent || 0)) / 100)), discount };
  }

  function restaurantTitle() {
    const name = local(data.settings, 'name');
    if (!name) return state.lang === 'en' ? 'MENU' : state.lang === 'ku' ? 'مینیو' : 'المنيو';
    return state.lang === 'en' ? `${name} MENU` : state.lang === 'ku' ? `مینیوی ${name}` : `منيو ${name}`;
  }

  function setLanguage(lang) {
    if (!['ar', 'ku', 'en'].includes(lang)) return;
    state.lang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    renderAll();
    setLanguageMenuOpen(false);
  }

  function setDiningMode(mode) {
    if (!['dinein', 'takeaway'].includes(mode)) return;
    state.mode = mode;
    document.documentElement.classList.toggle('sm-mode-dinein', mode === 'dinein');
    document.documentElement.classList.toggle('sm-mode-takeaway', mode === 'takeaway');
    byId('restbrDiningGate').classList.add('hidden');
    renderMenu();
    renderCart();
  }

  function ensureHeaderTools() {
    const header = $('.sm-header');
    if (!header) return;
    let tools = byId('smHeaderTools');
    if (!tools) {
      tools = document.createElement('div');
      tools.id = 'smHeaderTools';
      tools.className = 'sm-header-tools';
      header.appendChild(tools);
    }

    if (!byId('smSearchToggle')) {
      const button = document.createElement('button');
      button.id = 'smSearchToggle';
      button.type = 'button';
      button.className = 'sm-header-icon-btn';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="M14.8 14.8 20 20"></path></svg>';
      button.addEventListener('click', (event) => { event.stopPropagation(); setSearchPanelOpen(!byId('smSearchWrap').classList.contains('open')); });
      tools.appendChild(button);
    }

    if (!byId('smLangToggle')) {
      const button = document.createElement('button');
      button.id = 'smLangToggle';
      button.type = 'button';
      button.className = 'sm-header-icon-btn';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        setSearchPanelOpen(false);
        setLanguageMenuOpen(!byId('smLangs').classList.contains('open'));
      });
      tools.appendChild(button);
    }

    const holder = byId('smLangs');
    if (holder.parentElement !== tools) tools.appendChild(holder);

    if (!byId('smSearchWrap')) {
      const wrap = document.createElement('div');
      wrap.id = 'smSearchWrap';
      wrap.className = 'sm-search-wrap';
      wrap.innerHTML = '<div class="sm-search-row"><span class="sm-search-icon">⌕</span><input id="smSearchInput" class="sm-search-input" type="search" autocomplete="off" enterkeyhint="search"><button id="smSearchClear" class="sm-search-clear" type="button">×</button></div><div id="smSearchCount" class="sm-search-count"></div>';
      tools.appendChild(wrap);
      byId('smSearchInput').addEventListener('input', (event) => { state.searchQuery = event.target.value.trim(); renderMenu(); updateSearchCount(); });
      byId('smSearchClear').addEventListener('click', () => { state.searchQuery = ''; byId('smSearchInput').value = ''; setSearchPanelOpen(false); renderMenu(); updateSearchCount(); });
    }
  }

  function setLanguageMenuOpen(open) { byId('smLangs')?.classList.toggle('open', Boolean(open)); }
  function setSearchPanelOpen(open) {
    const wrap = byId('smSearchWrap');
    if (!wrap) return;
    wrap.classList.toggle('open', Boolean(open));
    if (open) {
      setLanguageMenuOpen(false);
      setTimeout(() => byId('smSearchInput')?.focus(), 40);
    }
  }

  function renderLanguages() {
    ensureHeaderTools();
    const holder = byId('smLangs');
    holder.className = 'sm-lang-menu';
    holder.innerHTML = `<button type="button" data-lang="ar" class="${state.lang === 'ar' ? 'active' : ''}">عربي</button><button type="button" data-lang="ku" class="${state.lang === 'ku' ? 'active' : ''}">کوردی</button><button type="button" data-lang="en" class="${state.lang === 'en' ? 'active' : ''}">English</button>`;
    $$('[data-lang]', holder).forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
    byId('smLangToggle').innerHTML = `<span class="sm-lang-glyph" aria-hidden="true"><b>ع</b><i>A</i></span><small class="sm-lang-code">${state.lang.toUpperCase()}</small>`;
    byId('smLangToggle').setAttribute('aria-label', state.lang === 'en' ? 'Language' : state.lang === 'ku' ? 'زمان' : 'اللغة');
    byId('smSearchToggle').setAttribute('aria-label', state.lang === 'en' ? 'Search menu' : state.lang === 'ku' ? 'لێگەڕان' : 'البحث في المنيو');
    byId('smSearchInput').placeholder = I18N[state.lang].search;
  }

  function renderHeader() {
    const settings = data.settings;
    $('.sm-intro-brand').textContent = local(settings, 'name');
    $('.sm-header > h1').textContent = restaurantTitle();
    byId('smSubtitle').textContent = local(settings, 'subtitle');
    document.title = `${local(settings, 'name')} — Menu`;

    const headerLogo = $('.sm-logo');
    if (headerLogo) {
      headerLogo.removeAttribute('src');
      headerLogo.style.display = 'none';
    }
    const headerWrap = $('.sm-logo-wrap');
    if (headerWrap) headerWrap.classList.add('restbr-logo-placeholder');

    const introLogo = $('.sm-intro-logo');
    if (introLogo) {
      introLogo.removeAttribute('src');
      introLogo.style.display = 'none';
    }
    const introWrap = $('.sm-intro-logo-wrap');
    if (introWrap) introWrap.classList.add('restbr-logo-placeholder');

    renderLanguages();

    const labels = I18N[state.lang];
    byId('smActions').className = 'sm-actions sm-quick-actions';
    byId('smActions').innerHTML = `<a href="#"><span>📍</span><b>${labels.location}</b></a><a href="tel:${settings.phone}"><span>☎</span><b>${labels.call}</b></a><a href="#"><span>💬</span><b>${labels.whatsapp}</b></a>`;
    byId('smActions').style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';

    renderAnnouncement();
  }

  function renderAnnouncement() {
    let announcement = byId('smAnnouncement');
    if (!announcement) {
      announcement = document.createElement('div');
      announcement.id = 'smAnnouncement';
      announcement.className = 'sm-news-ticker';
      const target = $('.sm-cats-wrap');
      target.parentNode.insertBefore(announcement, target);
    }
    const text = local(data.settings, 'announcement');
    if (!text) { announcement.style.display = 'none'; return; }
    const label = state.lang === 'en' ? 'NEWS' : state.lang === 'ku' ? 'نوێ' : 'عاجل';
    const duration = Math.max(6, Math.min(16, Math.round(text.length * .11)));
    announcement.style.setProperty('--sm-news-duration', `${duration}s`);
    announcement.innerHTML = `<span class="sm-news-label">${label}</span><div class="sm-news-window"><div class="sm-news-track"><span class="sm-news-copy" dir="auto">${text}<i class="sm-news-dot">●</i></span><span class="sm-news-copy" dir="auto" aria-hidden="true">${text}<i class="sm-news-dot">●</i></span></div></div>`;
    announcement.style.display = 'flex';
  }

  function renderDiningCopy() {
    const copy = {
      ar: { title:'طلبك وين؟', sub:'اختر قبل عرض المنيو', dine:'داخل المطعم', dineSub:'عرض أسعار الداخل', takeaway:'سفري', takeawaySub:'عرض أسعار السفري', loading:'جاري تحميل الأسعار...' },
      ku: { title:'چۆن دەتەوێت خواردنەکەت؟', sub:'پێش بینینی مینیو هەڵبژێرە', dine:'لە ناو چێشتخانە', dineSub:'نرخی ناو چێشتخانە', takeaway:'سەفەری', takeawaySub:'نرخی سەفەری', loading:'نرخەکان بار دەکرێن...' },
      en: { title:'How will you enjoy your meal?', sub:'Choose before viewing the menu', dine:'Dine in', dineSub:'View dine-in prices', takeaway:'Takeaway', takeawaySub:'View takeaway prices', loading:'Loading prices...' }
    }[state.lang];
    byId('restbrDiningTitle').textContent = copy.title;
    byId('restbrDiningText').textContent = copy.sub;
    byId('restbrDineInLabel').textContent = copy.dine;
    byId('restbrDineInSub').textContent = copy.dineSub;
    byId('restbrTakeawayLabel').textContent = copy.takeaway;
    byId('restbrTakeawaySub').textContent = copy.takeawaySub;
    byId('restbrDiningLoading').textContent = copy.loading;
  }

  function renderCategories() {
    const rail = byId('smCats');
    const saved = rail.scrollLeft;
    rail.innerHTML = data.categories.map((category) => `<button type="button" class="sm-cat ${state.activeCategory === category.id ? 'active' : ''}" data-category="${category.id}">${local(category, 'name')}</button>`).join('');
    $$('[data-category]', rail).forEach((button) => button.addEventListener('click', () => {
      state.activeCategory = button.dataset.category;
      state.searchQuery = '';
      if (byId('smSearchInput')) byId('smSearchInput').value = '';
      renderCategories();
      renderMenu();
      updateSearchCount();
      requestAnimationFrame(() => { rail.scrollLeft = saved; });
    }));
  }

  function priceMarkup(product, option) {
    const value = optionPrice(product, option);
    if (!value.discount) return `<b class="sm-price">${money(value.final)}</b>`;
    return `<b class="sm-price sm-price-discounted"><span class="sm-price-before">${money(value.base)}</span><span class="sm-price-after">${money(value.final)}</span><span class="restbr-sale-pill">-${value.discount.discount_percent}%</span></b>`;
  }

  function badgeMarkup(product) {
    const discount = activeDiscount(product);
    let html = '';
    if (product.badge === 'popular') html += `<span class="sm-display-badge gold">⭐ ${I18N[state.lang].popular}</span>`;
    if (product.badge === 'hot') html += `<span class="sm-display-badge red">🔥 ${I18N[state.lang].hot}</span>`;
    if (discount) html += `<span class="sm-display-badge offer">🏷 ${I18N[state.lang].offer} -${discount.discount_percent}%</span>`;
    return html ? `<div class="sm-badges">${html}</div>` : '';
  }

  function productCard(product) {
    const category = data.categories.find((row) => row.id === product.category_id);
    const name = local(product, 'name');
    const tone = category.id === 'cat-drinks' ? '#245469' : category.id === 'cat-western' ? '#7d3925' : '#9f6b2d';
    const classes = ['sm-card', 'sm-reveal', category.effect || '', product.badge === 'popular' ? 'sm-popular-card' : '', product.badge === 'hot' ? 'sm-hot-card' : ''].filter(Boolean).join(' ');
    const optionRows = product.options.map((option) => `<div class="sm-option"><span>${local(option, 'name')}</span><div class="sm-option-buy">${priceMarkup(product, option)}</div></div>`).join('');
    const button = product.options.length > 1
      ? `<button class="sm-choose-options" type="button" data-choose="${product.id}"><span>+</span><b>${I18N[state.lang].choose}</b></button>`
      : `<button class="sm-direct-add" type="button" data-add="${product.id}" data-option="${product.options[0].id}"><span>+</span><b>${I18N[state.lang].add}</b></button>`;

    return `<article id="product-${product.id}" class="${classes}" data-product-card="${product.id}">
      <button class="sm-share-product" type="button" data-share-product="${product.id}" aria-label="${I18N[state.lang].share}">↗</button>
      ${badgeMarkup(product)}
      <div class="sm-img"><img class="sm-product-image" data-image-product="${product.id}" loading="lazy" decoding="async" src="${svgImage(name, tone)}" alt="${name}"></div>
      <div class="sm-info"><div class="sm-name">${name}</div>${state.searchQuery ? `<div class="sm-search-category">${local(category, 'name')}</div>` : ''}<div class="sm-options-scroll">${optionRows}</div>${button}</div>
    </article>`;
  }

  function renderMenu() {
    const menu = byId('smMenu');
    if (state.searchQuery) {
      const products = data.products.filter(productMatchesSearch);
      updateSearchCount(products.length);
      menu.innerHTML = products.length
        ? `<section class="sm-section"><div class="sm-section-head"><h2 class="sm-section-title">${I18N[state.lang].searchResults}</h2></div><div class="sm-grid">${products.map(productCard).join('')}</div></section>`
        : `<section class="sm-section"><div style="padding:30px 12px;text-align:center;color:#9a9188">${I18N[state.lang].noResults}</div></section>`;
    } else {
      const category = data.categories.find((row) => row.id === state.activeCategory) || data.categories[0];
      const products = data.products.filter((product) => product.category_id === category.id).sort((a,b) => a.sort_order - b.sort_order);
      menu.innerHTML = `<section class="sm-section"><div class="sm-section-head"><h2 class="sm-section-title">${local(category, 'name')}</h2><button class="sm-share-category" type="button" data-share-category="${category.id}" aria-label="${I18N[state.lang].share}">↗</button></div><div class="sm-grid">${products.map(productCard).join('')}</div></section>`;
    }

    $$('[data-add]', menu).forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.add, button.dataset.option)));
    $$('[data-choose]', menu).forEach((button) => button.addEventListener('click', () => openChoice(button.dataset.choose)));
    $$('[data-image-product]', menu).forEach((image) => image.addEventListener('click', () => openImage(image.dataset.imageProduct, image.src)));
    $$('[data-share-product]', menu).forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); shareFixtureLink(`product-${button.dataset.shareProduct}`, local(findProduct(button.dataset.shareProduct), 'name')); }));
    $$('[data-share-category]', menu).forEach((button) => button.addEventListener('click', () => {
      const category = data.categories.find((row) => row.id === button.dataset.shareCategory);
      shareFixtureLink(`category-${category.id}`, local(category, 'name'));
    }));
    watchCards();
  }

  function updateSearchCount(count = null) {
    const holder = byId('smSearchCount');
    if (!holder) return;
    if (!state.searchQuery) { holder.textContent = ''; return; }
    const total = count ?? data.products.filter(productMatchesSearch).length;
    holder.textContent = state.lang === 'en' ? `${total} result${total === 1 ? '' : 's'}` : state.lang === 'ku' ? `${total} ئەنجام` : `${total} نتيجة`;
  }

  async function shareFixtureLink(fragment, title) {
    const url = `${location.origin}${location.pathname}#${fragment}`;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
    } catch (_) {
      try { await navigator.clipboard.writeText(url); } catch (_) {}
    }
    toast(I18N[state.lang].copied);
  }

  function renderFooter() {
    const settings = data.settings;
    $('.sm-footer h2').textContent = local(settings, 'name');
    $('.sm-footer-location').textContent = local(settings, 'address');
    $('.sm-footer-phone').textContent = settings.phone;
    $('.sm-footer-copy').textContent = `${local(settings, 'name')} — All Rights Reserved ${new Date().getFullYear()} ©`;
    byId('smFooterLocation').textContent = I18N[state.lang].location;
    byId('smFooterCall').textContent = I18N[state.lang].call;
    byId('smFooterWhatsapp').textContent = I18N[state.lang].whatsapp;
    byId('smFooterCall').href = `tel:${settings.phone}`;
  }

  const findProduct = (id) => data.products.find((product) => product.id === id);
  const findOption = (product, id) => product?.options.find((option) => option.id === id);

  function addToCart(productId, optionId) {
    if (state.mode !== 'takeaway') return;
    const product = findProduct(productId);
    const option = findOption(product, optionId);
    if (!product || !option) return;
    const key = `${productId}:${optionId}`;
    const existing = state.cart.find((item) => item.key === key);
    if (existing) existing.qty += 1;
    else state.cart.push({ key, productId, optionId, qty: 1 });
    renderCart();
    toast(state.lang === 'en' ? 'Added to cart' : state.lang === 'ku' ? 'هاته زێدەکرن' : 'تمت الإضافة إلى السلة');
  }

  function renderCart() {
    const fab = byId('smCartFab');
    const items = byId('smCartItems');
    const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
    let total = 0;
    fab.classList.toggle('has-items', totalQty > 0);
    fab.innerHTML = `🛒 <span>${state.lang === 'en' ? 'Cart' : state.lang === 'ku' ? 'سەبەتە' : 'السلة'}</span> <b>${totalQty}</b>`;

    if (!state.cart.length) {
      items.innerHTML = `<div class="sm-cart-empty"><div>🛒</div><span>${state.lang === 'en' ? 'Your cart is empty' : state.lang === 'ku' ? 'سەبەتە یا تە بەتاڵە' : 'السلة فارغة'}</span></div>`;
    } else {
      items.innerHTML = state.cart.map((item) => {
        const product = findProduct(item.productId);
        const option = findOption(product, item.optionId);
        const line = optionPrice(product, option).final * item.qty;
        total += line;
        return `<div class="sm-cart-item" data-cart-key="${item.key}"><img src="${svgImage(local(product, 'name'))}" alt=""><div class="sm-cart-item-info"><strong>${local(product, 'name')}</strong><small>${local(option, 'name')}</small><b>${money(line)}</b></div><div class="sm-cart-qty"><button type="button" data-dec="${item.key}">−</button><span>${item.qty}</span><button type="button" data-inc="${item.key}">＋</button></div><button type="button" class="sm-cart-remove" data-remove="${item.key}">×</button></div>`;
      }).join('');
    }

    byId('smCartTotal').textContent = money(total);
    byId('smCartClear').disabled = !state.cart.length;
    $$('[data-inc]', items).forEach((button) => button.addEventListener('click', () => changeQty(button.dataset.inc, 1)));
    $$('[data-dec]', items).forEach((button) => button.addEventListener('click', () => changeQty(button.dataset.dec, -1)));
    $$('[data-remove]', items).forEach((button) => button.addEventListener('click', () => removeCart(button.dataset.remove)));
  }

  function changeQty(key, delta) {
    const item = state.cart.find((entry) => entry.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((entry) => entry.key !== key);
    renderCart();
  }

  function removeCart(key) { state.cart = state.cart.filter((entry) => entry.key !== key); renderCart(); }
  function openCart() { if (state.mode !== 'takeaway') return; byId('smCartBackdrop').classList.add('open'); byId('smCartDrawer').classList.add('open'); document.body.classList.add('sm-cart-lock'); }
  function closeCart() { byId('smCartBackdrop').classList.remove('open'); byId('smCartDrawer').classList.remove('open'); document.body.classList.remove('sm-cart-lock'); }

  function openChoice(productId) {
    if (state.mode !== 'takeaway') return;
    const product = findProduct(productId);
    if (!product) return;
    byId('smChoiceTitle').textContent = local(product, 'name');
    byId('smChoiceList').innerHTML = product.options.map((option) => `<button type="button" class="sm-choice-option" data-choice-option="${option.id}"><span>${local(option, 'name')}</span>${priceMarkup(product, option)}<i>＋</i></button>`).join('');
    $$('[data-choice-option]', byId('smChoiceList')).forEach((button) => button.addEventListener('click', () => { addToCart(productId, button.dataset.choiceOption); closeChoice(); }));
    byId('smChoiceBackdrop').classList.add('open');
    byId('smChoiceSheet').classList.add('open');
  }

  function closeChoice() { byId('smChoiceBackdrop').classList.remove('open'); byId('smChoiceSheet').classList.remove('open'); }
  function openImage(productId, src) { const product = findProduct(productId); byId('smImageViewerImg').src = src; byId('smImageCaption').textContent = local(product, 'name'); byId('smImageViewer').classList.add('open'); }

  function toast(message) {
    const element = byId('smCartToast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 1300);
  }

  function watchCards() {
    if (!revealObserver && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('sm-visible'); revealObserver.unobserve(entry.target); }
      }), { rootMargin:'0px 0px -6% 0px', threshold:.05 });
    }
    $$('.sm-card:not(.watched)').forEach((card) => {
      card.classList.add('watched');
      if (revealObserver) revealObserver.observe(card); else card.classList.add('sm-visible');
    });
  }

  function pinCategories() {
    const cats = byId('smCats');
    const sentinel = byId('smCatsSentinel');
    if (!cats || !sentinel || state.catsFixed) return;
    state.savedCatsX = cats.scrollLeft;
    sentinel.style.height = `${Math.ceil(cats.getBoundingClientRect().height)}px`;
    cats.classList.add('fixed');
    cats.scrollLeft = state.savedCatsX;
    state.catsFixed = true;
  }

  function unpinCategories() {
    const cats = byId('smCats');
    const sentinel = byId('smCatsSentinel');
    if (!cats || !sentinel || !state.catsFixed) return;
    state.savedCatsX = cats.scrollLeft;
    cats.classList.remove('fixed');
    sentinel.style.height = '1px';
    cats.scrollLeft = state.savedCatsX;
    state.catsFixed = false;
  }

  function scrollEffects() {
    const root = document.documentElement;
    const max = root.scrollHeight - root.clientHeight;
    byId('smProgress').style.width = `${max ? root.scrollTop / max * 100 : 0}%`;
    const sentinel = byId('smCatsSentinel');
    if (sentinel) {
      if (!state.catsFixed && sentinel.getBoundingClientRect().top <= 0) pinCategories();
      if (state.catsFixed && window.scrollY <= sentinel.offsetTop) unpinCategories();
    }
    byId('smTopBtn').classList.toggle('show', window.scrollY > 520);
  }

  function renderAll() {
    renderHeader();
    renderDiningCopy();
    renderCategories();
    renderMenu();
    renderFooter();
    renderCart();
    updateSearchCount();
  }

  function bindShell() {
    byId('restbrDineIn').addEventListener('click', () => setDiningMode('dinein'));
    byId('restbrTakeaway').addEventListener('click', () => setDiningMode('takeaway'));
    byId('smCartFab').addEventListener('click', openCart);
    byId('smCartClose').addEventListener('click', closeCart);
    byId('smCartBackdrop').addEventListener('click', closeCart);
    byId('smCartClear').addEventListener('click', () => { state.cart = []; renderCart(); });
    byId('smChoiceClose').addEventListener('click', closeChoice);
    byId('smChoiceBackdrop').addEventListener('click', closeChoice);
    byId('smImageViewerClose').addEventListener('click', () => byId('smImageViewer').classList.remove('open'));
    byId('smImageViewer').addEventListener('click', (event) => { if (event.target === byId('smImageViewer')) byId('smImageViewer').classList.remove('open'); });
    byId('smCartContinue').addEventListener('click', () => toast(state.lang === 'en' ? 'Fixture checkout only' : state.lang === 'ku' ? 'Checkout بتنێ بۆ تاقیکرنێ' : 'Checkout تجريبي فقط'));
    byId('smTopBtn').addEventListener('click', () => scrollTo({ top:0, behavior:'smooth' }));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#smLangToggle') && !event.target.closest('#smLangs')) setLanguageMenuOpen(false);
      if (!event.target.closest('#smSearchToggle') && !event.target.closest('#smSearchWrap')) setSearchPanelOpen(false);
    });
    addEventListener('scroll', scrollEffects, { passive:true });
  }

  bindShell();
  renderAll();
  setTimeout(() => byId('smIntro').classList.add('hide'), 620);
  setTimeout(() => { byId('smIntro').style.display = 'none'; }, 900);
})();
