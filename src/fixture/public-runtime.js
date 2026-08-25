(() => {
  'use strict';

  const data = window.RESTBR_GOLD_FIXTURE;
  if (!data) throw new Error('RESTBR Gold fixture is missing.');

  const state = {
    lang: 'ar',
    mode: null,
    cart: [],
    activeCategory: data.categories[0]?.id || null,
    selectedProduct: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  const local = (row, key) => row?.[`${key}_${state.lang}`] || row?.[`${key}_ar`] || row?.[`${key}_en`] || '';
  const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ${data.settings.currency}`;

  function svgImage(label, tone = '#9f6b2d') {
    const safe = String(label || 'GOLD').replace(/[<>&"']/g, '').slice(0, 22);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><radialGradient id="g" cx="28%" cy="20%"><stop offset="0" stop-color="#efd28d"/><stop offset=".38" stop-color="${tone}"/><stop offset="1" stop-color="#120d08"/></radialGradient></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="450" cy="390" r="185" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="5"/><text x="450" y="405" text-anchor="middle" fill="#fff4d7" font-family="Arial" font-size="58" font-weight="800">${safe}</text><text x="450" y="490" text-anchor="middle" fill="#efc46f" font-family="Arial" font-size="26" letter-spacing="8">RESTBR GOLD</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function activeDiscount(product) {
    return data.discounts.find((d) => {
      if (!d.is_active) return false;
      if (d.price_mode !== 'both' && d.price_mode !== state.mode) return false;
      if (d.scope_type === 'product') return d.target_id === product.id;
      if (d.scope_type === 'category') return d.target_id === product.category_id;
      return d.scope_type === 'all';
    }) || null;
  }

  function optionPrice(product, option) {
    const base = state.mode === 'takeaway' ? Number(option.takeaway_price ?? option.price ?? 0) : Number(option.price || 0);
    const discount = activeDiscount(product);
    if (!discount) return { base, final: base, discount: null };
    const final = Math.round(base * (1 - Number(discount.discount_percent || 0) / 100));
    return { base, final, discount };
  }

  function setLanguage(lang) {
    if (!['ar', 'ku', 'en'].includes(lang)) return;
    state.lang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    renderAll();
  }

  function setDiningMode(mode) {
    state.mode = mode;
    byId('restbrDiningGate')?.classList.add('hidden');
    renderMenu();
    renderCart();
  }

  function renderHeader() {
    const s = data.settings;
    $('.sm-intro-brand').textContent = local(s, 'name');
    $('.sm-header > h1').textContent = local(s, 'name');
    byId('smSubtitle').textContent = local(s, 'subtitle');
    byId('restbrAnnouncement').textContent = local(s, 'announcement');

    const logo = $('.sm-logo');
    logo.removeAttribute('src');
    logo.style.visibility = 'hidden';
    const wrap = $('.sm-logo-wrap');
    wrap.classList.add('restbr-logo-placeholder');
    wrap.textContent = 'G';

    const introWrap = $('.sm-intro-logo-wrap');
    introWrap.classList.add('restbr-logo-placeholder');
    introWrap.textContent = 'G';
    $('.sm-intro-logo').style.display = 'none';

    byId('smLangs').innerHTML = ['ar', 'ku', 'en'].map((lang) => {
      const label = lang === 'ar' ? 'العربية' : lang === 'ku' ? 'کوردی' : 'English';
      return `<button type="button" data-lang="${lang}" class="${state.lang === lang ? 'active' : ''}">${label}</button>`;
    }).join('');
    byId('smLangs').className = 'sm-langs sm-lang-switch';
    $$('[data-lang]', byId('smLangs')).forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));

    const actionLabels = state.lang === 'en'
      ? ['Location', 'Call', 'WhatsApp']
      : state.lang === 'ku'
        ? ['جهێ مه', 'پەیوەندی', 'WhatsApp']
        : ['موقعنا', 'اتصال', 'WhatsApp'];
    byId('smActions').className = 'sm-actions sm-quick-actions';
    byId('smActions').innerHTML = `
      <a href="#" aria-label="location">⌖ <b>${actionLabels[0]}</b></a>
      <a href="tel:${s.phone}">☎ <b>${actionLabels[1]}</b></a>
      <a href="#" aria-label="whatsapp">◉ <b>${actionLabels[2]}</b></a>`;
  }

  function renderCategories() {
    const container = byId('smCats');
    container.innerHTML = data.categories.map((category) => `
      <button type="button" class="sm-cat ${state.activeCategory === category.id ? 'active' : ''}" data-category="${category.id}">${local(category, 'name')}</button>`).join('');
    $$('[data-category]', container).forEach((button) => {
      button.addEventListener('click', () => {
        state.activeCategory = button.dataset.category;
        renderCategories();
        byId(`section-${button.dataset.category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function priceMarkup(product, option) {
    const p = optionPrice(product, option);
    if (!p.discount) return `<b class="sm-price">${money(p.final)}</b>`;
    return `<b class="sm-price"><span class="restbr-price-old">${money(p.base)}</span><span class="restbr-price-new">${money(p.final)}</span><span class="restbr-sale-pill">-${p.discount.discount_percent}%</span></b>`;
  }

  function badgeMarkup(product) {
    const discount = activeDiscount(product);
    const badges = [];
    if (product.badge === 'popular') badges.push('<span class="sm-display-badge gold">★ POPULAR</span>');
    if (product.badge === 'hot') badges.push('<span class="sm-display-badge red">HOT</span>');
    if (discount) badges.push(`<span class="sm-display-badge offer">-${discount.discount_percent}%</span>`);
    return badges.length ? `<div class="sm-badges">${badges.join('')}</div>` : '';
  }

  function cardMarkup(product, category) {
    const name = local(product, 'name');
    const tone = category.id === 'cat-drinks' ? '#245469' : category.id === 'cat-western' ? '#7d3925' : '#9f6b2d';
    const options = product.options.map((option) => `
      <div class="sm-option">
        <span>${local(option, 'name')}</span>
        <div class="sm-option-buy">${priceMarkup(product, option)}</div>
      </div>`).join('');
    const action = product.options.length > 1
      ? `<button class="sm-choose-options" type="button" data-choose="${product.id}"><span>＋</span>${state.lang === 'en' ? 'Choose' : state.lang === 'ku' ? 'هەلبژێرە' : 'اختيار'}</button>`
      : `<button class="sm-direct-add" type="button" data-add="${product.id}" data-option="${product.options[0].id}"><span>＋</span>${state.lang === 'en' ? 'Add' : state.lang === 'ku' ? 'زێدە بکە' : 'إضافة'}</button>`;

    return `<article class="sm-card sm-reveal sm-visible ${category.effect || ''}" data-product-card="${product.id}">
      ${badgeMarkup(product)}
      <div class="sm-info">
        <div class="sm-name">${name}</div>
        ${options}
        ${action}
      </div>
      <div class="sm-img"><img class="sm-product-image" data-image-product="${product.id}" alt="${name}" src="${svgImage(name, tone)}"></div>
    </article>`;
  }

  function renderMenu() {
    const menu = byId('smMenu');
    menu.innerHTML = data.categories.map((category) => {
      const products = data.products.filter((product) => product.category_id === category.id).sort((a, b) => a.sort_order - b.sort_order);
      return `<section class="sm-section" id="section-${category.id}">
        <h2 class="sm-section-title">${local(category, 'name')}</h2>
        <div class="sm-grid">${products.map((product) => cardMarkup(product, category)).join('')}</div>
      </section>`;
    }).join('');

    $$('[data-add]', menu).forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.add, button.dataset.option)));
    $$('[data-choose]', menu).forEach((button) => button.addEventListener('click', () => openChoice(button.dataset.choose)));
    $$('[data-image-product]', menu).forEach((image) => image.addEventListener('click', () => openImage(image.dataset.imageProduct, image.src)));
  }

  function renderFooter() {
    const s = data.settings;
    $('.sm-footer h2').textContent = local(s, 'name');
    $('.sm-footer-location').textContent = local(s, 'address');
    $('.sm-footer-phone').textContent = s.phone;
    $('.sm-footer-copy').textContent = `© RESTBR GOLD — ${new Date().getFullYear()}`;
    const labels = state.lang === 'en' ? ['Location', 'Call', 'WhatsApp'] : state.lang === 'ku' ? ['جهێ مه', 'پەیوەندی', 'WhatsApp'] : ['موقعنا', 'اتصال', 'WhatsApp'];
    byId('smFooterLocation').textContent = labels[0];
    byId('smFooterCall').textContent = labels[1];
    byId('smFooterWhatsapp').textContent = labels[2];
    byId('smFooterCall').href = `tel:${s.phone}`;
  }

  function findProduct(productId) { return data.products.find((p) => p.id === productId); }
  function findOption(product, optionId) { return product?.options.find((o) => o.id === optionId); }

  function addToCart(productId, optionId) {
    if (!state.mode) return;
    const product = findProduct(productId);
    const option = findOption(product, optionId);
    if (!product || !option) return;
    const key = `${productId}:${optionId}:${state.mode}`;
    const existing = state.cart.find((item) => item.key === key);
    if (existing) existing.qty += 1;
    else state.cart.push({ key, productId, optionId, mode: state.mode, qty: 1 });
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
        const p = optionPrice(product, option);
        const line = p.final * item.qty;
        total += line;
        return `<div class="sm-cart-item" data-cart-key="${item.key}">
          <img src="${svgImage(local(product, 'name'))}" alt="">
          <div class="sm-cart-item-info"><strong>${local(product, 'name')}</strong><small>${local(option, 'name')}</small><b>${money(line)}</b></div>
          <div class="sm-cart-qty"><button type="button" data-dec="${item.key}">−</button><span>${item.qty}</span><button type="button" data-inc="${item.key}">＋</button></div>
          <button type="button" class="sm-cart-remove" data-remove="${item.key}">×</button>
        </div>`;
      }).join('');
    }

    byId('smCartTotal').textContent = money(total);
    byId('smCartClear').disabled = !state.cart.length;
    $$('[data-inc]', items).forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.inc, 1)));
    $$('[data-dec]', items).forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.dec, -1)));
    $$('[data-remove]', items).forEach((b) => b.addEventListener('click', () => removeCart(b.dataset.remove)));
  }

  function changeQty(key, delta) {
    const item = state.cart.find((x) => x.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((x) => x.key !== key);
    renderCart();
  }

  function removeCart(key) {
    state.cart = state.cart.filter((x) => x.key !== key);
    renderCart();
  }

  function openCart() {
    byId('smCartBackdrop').classList.add('open');
    byId('smCartDrawer').classList.add('open');
    document.body.classList.add('sm-cart-lock');
  }
  function closeCart() {
    byId('smCartBackdrop').classList.remove('open');
    byId('smCartDrawer').classList.remove('open');
    document.body.classList.remove('sm-cart-lock');
  }

  function openChoice(productId) {
    const product = findProduct(productId);
    if (!product) return;
    state.selectedProduct = productId;
    byId('smChoiceTitle').textContent = local(product, 'name');
    byId('smChoiceList').innerHTML = product.options.map((option) => `
      <button type="button" class="sm-choice-option" data-choice-option="${option.id}">
        <span>${local(option, 'name')}</span>${priceMarkup(product, option)}<i>＋</i>
      </button>`).join('');
    $$('[data-choice-option]', byId('smChoiceList')).forEach((button) => button.addEventListener('click', () => {
      addToCart(productId, button.dataset.choiceOption);
      closeChoice();
    }));
    byId('smChoiceBackdrop').classList.add('open');
    byId('smChoiceSheet').classList.add('open');
  }
  function closeChoice() {
    byId('smChoiceBackdrop').classList.remove('open');
    byId('smChoiceSheet').classList.remove('open');
  }

  function openImage(productId, src) {
    const product = findProduct(productId);
    byId('smImageViewerImg').src = src;
    byId('smImageCaption').textContent = local(product, 'name');
    byId('smImageViewer').classList.add('open');
  }

  function toast(message) {
    const el = byId('smCartToast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 1300);
  }

  function renderAll() {
    renderHeader();
    renderCategories();
    renderMenu();
    renderFooter();
    renderCart();
    byId('restbrDiningTitle').textContent = state.lang === 'en' ? 'How will you order?' : state.lang === 'ku' ? 'داخوازیا تە چەوا دێ بیت؟' : 'شلون راح يكون طلبك؟';
    byId('restbrDiningText').textContent = state.lang === 'en' ? 'Choose dine-in or takeaway to display the correct prices.' : state.lang === 'ku' ? 'ژ بۆ نیشاندانا نرخێ دروست، ناڤ رێستورانێ یان سفری هەلبژێرە.' : 'اختَر داخل المطعم أو سفري حتى نعرض السعر الصحيح.';
    byId('restbrDineIn').textContent = state.lang === 'en' ? 'Dine in' : state.lang === 'ku' ? 'ناڤ رێستورانێ' : 'داخل المطعم';
    byId('restbrTakeaway').textContent = state.lang === 'en' ? 'Takeaway' : state.lang === 'ku' ? 'سفری' : 'سفري';
  }

  function bindShell() {
    byId('restbrDineIn').addEventListener('click', () => setDiningMode('dine_in'));
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
    byId('smTopBtn').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

    addEventListener('scroll', () => {
      const top = scrollY || document.documentElement.scrollTop;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      byId('smProgress').style.width = `${Math.min(100, Math.max(0, top / max * 100))}%`;
      byId('smTopBtn').classList.toggle('show', top > 450);
    }, { passive: true });
  }

  bindShell();
  renderAll();
  setTimeout(() => byId('smIntro').classList.add('hide'), 780);
})();
