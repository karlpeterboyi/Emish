/**
 * Emish mobile-first header + language toggle (UK / Tanzania flags)
 */
(function () {
  var LINKS = [
    { href: 'index.html', key: 'nav_home', match: /index\.html|^\/$|\/$/ },
    { href: 'products.html', key: 'nav_shop', match: /products|product\.html/ },
    { href: 'services.html', key: 'nav_services', match: /services/ },
    { href: 'booking.html', key: 'nav_book', match: /booking/ },
    { href: 'referral.html', key: 'nav_referral', match: /referral/ },
  ];

  function t(key) {
    if (typeof window.t === 'function') return window.t(key);
    var lang = localStorage.getItem('emish_lang') || localStorage.getItem('niffer_lang') || 'en';
    var dict = (window.translations && window.translations[lang]) || {};
    return dict[key] || key;
  }

  function cartCount() {
    try {
      if (typeof getCartCount === 'function') return getCartCount();
      var raw = localStorage.getItem('emish_cart') || localStorage.getItem('niffer_cart');
      var cart = raw ? JSON.parse(raw) : [];
      return cart.reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    } catch (e) {
      return 0;
    }
  }

  function isLoggedIn() {
    return !!(localStorage.getItem('emish_token') || localStorage.getItem('niffer_token') ||
      localStorage.getItem('emish_user') || localStorage.getItem('niffer_user'));
  }

  function currentLang() {
    return localStorage.getItem('emish_lang') || localStorage.getItem('niffer_lang') || 'en';
  }

  function buildNav() {
    if (document.getElementById('emish-topnav')) return;
    var path = location.pathname || '';
    var count = cartCount();
    var logged = isLoggedIn();
    var lang = currentLang();

    var desktopLinks = LINKS.map(function (l) {
      var active = l.match.test(path);
      return '<a href="' + l.href + '" class="emish-nav-link' + (active ? ' active' : '') + '" data-i18n="' + l.key + '">' + t(l.key) + '</a>';
    }).join('');

    var mobileLinks = LINKS.map(function (l) {
      return '<a href="' + l.href + '" class="emish-drawer-link" data-i18n="' + l.key + '">' + t(l.key) + '</a>';
    }).join('');

    var authDesktop = logged
      ? '<a href="account.html" class="emish-btn-ghost" data-i18n="nav_account">' + t('nav_account') + '</a>'
      : '<a href="account.html#login" class="emish-btn-ghost" data-i18n="nav_login">' + t('nav_login') + '</a>' +
        '<a href="account.html#signup" class="emish-btn-primary" data-i18n="nav_signup">' + t('nav_signup') + '</a>';

    var authMobile = logged
      ? '<a href="account.html" class="emish-drawer-link font-semibold" data-i18n="nav_account">' + t('nav_account') + '</a>'
      : '<a href="account.html#login" class="emish-drawer-link" data-i18n="nav_login">' + t('nav_login') + '</a>' +
        '<a href="account.html#signup" class="emish-drawer-cta" data-i18n="nav_signup">' + t('nav_signup') + '</a>';

    var header = document.createElement('div');
    header.id = 'emish-topnav';
    header.innerHTML =
      '<div class="emish-announce" data-i18n="announcement">' + t('announcement') + '</div>' +
      '<header class="emish-header">' +
        '<div class="emish-header-inner">' +
          '<a href="index.html" class="emish-brand">' +
            '<img src="images/brand/logo.jpg" alt="Emish" class="emish-brand-logo" onerror="this.outerHTML=\'<span class=emish-brand-fallback>E</span>\'">' +
            '<span class="emish-brand-text"><strong>Emish</strong><small>Beauty Spa</small></span>' +
          '</a>' +
          '<nav class="emish-nav-desktop">' + desktopLinks + '</nav>' +
          '<div class="emish-header-actions">' +
            '<button type="button" id="emishLangBtn" class="emish-lang-btn" aria-label="Language">' +
              (lang === 'sw'
                ? '<span class="emish-flag" title="Kiswahili">🇹🇿</span><span class="emish-lang-code">SW</span>'
                : '<span class="emish-flag" title="English">🇬🇧</span><span class="emish-lang-code">EN</span>') +
            '</button>' +
            '<div class="emish-auth-desktop">' + authDesktop + '</div>' +
            '<a href="cart.html" class="emish-cart-btn" aria-label="Cart">' +
              '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' +
              '<span id="cartCount" class="emish-cart-badge' + (count ? '' : ' hidden') + '">' + (count > 99 ? '99+' : count) + '</span>' +
            '</a>' +
            '<button type="button" id="emishMenuBtn" class="emish-menu-btn" aria-label="Menu">' +
              '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div id="emishDrawer" class="emish-drawer" hidden>' +
        '<div class="emish-drawer-backdrop" id="emishDrawerBg"></div>' +
        '<div class="emish-drawer-panel">' +
          '<div class="emish-drawer-head">' +
            '<span data-i18n="nav_menu">' + t('nav_menu') + '</span>' +
            '<button type="button" id="emishDrawerClose" aria-label="Close">✕</button>' +
          '</div>' +
          mobileLinks +
          '<div class="emish-drawer-divider"></div>' +
          authMobile +
          '<a href="cart.html" class="emish-drawer-link" data-i18n="nav_cart">' + t('nav_cart') + '</a>' +
          '<a href="booking.html" class="emish-drawer-cta" data-i18n="nav_book_now">' + t('nav_book_now') + '</a>' +
          '<div class="emish-drawer-social">' +
            '<a href="https://wa.me/255672283434" target="_blank" rel="noopener" aria-label="WhatsApp">' + iconWA() + '</a>' +
            '<a href="https://instagram.com/emishbeautyspa" target="_blank" rel="noopener" aria-label="Instagram">' + iconIG() + '</a>' +
            '<a href="https://instagram.com/emish_product" target="_blank" rel="noopener" aria-label="Products">' + iconIG() + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Insert at top of body
    document.body.insertBefore(header, document.body.firstChild);

    // Hide legacy navs/announcements to avoid double headers
    document.querySelectorAll('body > nav, body > .sticky.top-0, body > div.bg-primary-700, body > div.bg-primary-800').forEach(function (el) {
      if (el.closest('#emish-topnav')) return;
      if (el.tagName === 'NAV' || el.classList.contains('sticky') || (el.className && String(el.className).indexOf('bg-primary') >= 0 && el.textContent && el.textContent.length < 200)) {
        el.style.display = 'none';
      }
    });

    document.getElementById('emishMenuBtn').onclick = function () {
      var d = document.getElementById('emishDrawer');
      d.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    function closeDrawer() {
      document.getElementById('emishDrawer').hidden = true;
      document.body.style.overflow = '';
    }
    document.getElementById('emishDrawerClose').onclick = closeDrawer;
    document.getElementById('emishDrawerBg').onclick = closeDrawer;

    document.getElementById('emishLangBtn').onclick = function () {
      var next = currentLang() === 'en' ? 'sw' : 'en';
      localStorage.setItem('emish_lang', next);
      localStorage.setItem('niffer_lang', next);
      if (typeof window.setLanguage === 'function') window.setLanguage(next);
      else if (typeof window.toggleLanguage === 'function') window.toggleLanguage();
      else location.reload();
    };
  }

  function iconWA() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.1-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.5-1-1-1.5-2-1.7-2.3-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.1-.3 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.2.7 2.6.6.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.6-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.8L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.2.8.9-3.1-.2-.3C4.3 15 3.8 13.5 3.8 12 3.8 7.5 7.5 3.8 12 3.8S20.2 7.5 20.2 12 16.5 20.2 12 20.2z"/></svg>';
  }
  function iconIG() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-3.2 1.7-4.8 4.9-4.9 1.3-.1 1.7-.1 4.9-.1zm0 1.8c-3.2 0-3.5 0-4.8.1-2.2.1-3.3 1.2-3.4 3.4-.1 1.2-.1 1.5-.1 4.8s0 3.5.1 4.8c.1 2.2 1.2 3.3 3.4 3.4 1.2.1 1.6.1 4.8.1s3.5 0 4.8-.1c2.2-.1 3.3-1.2 3.4-3.4.1-1.2.1-1.6.1-4.8s0-3.5-.1-4.8c-.1-2.2-1.2-3.3-3.4-3.4-1.3-.1-1.6-.1-4.8-.1zm0 3.1a5 5 0 110 10 5 5 0 010-10zm0 1.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm5.2-.9a1.2 1.2 0 110 2.3 1.2 1.2 0 010-2.3z"/></svg>';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildNav);
  else buildNav();
  window.emishRebuildNav = buildNav;
})();
