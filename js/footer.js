/** Emish branded footer — injects into #site-footer or end of body */
(function () {
  function inject() {
    if (document.getElementById('emish-site-footer')) return;
    var foot = document.createElement('footer');
    foot.id = 'emish-site-footer';
    foot.className = 'emish-footer';
    foot.innerHTML =
      '<div class="emish-footer-inner">' +
        '<div class="emish-footer-brand">' +
          '<img src="images/brand/logo.jpg" alt="Emish" class="emish-footer-logo" onerror="this.style.display=\'none\'">' +
          '<div>' +
            '<p class="emish-footer-name">Emish Beauty Spa</p>' +
            '<p class="emish-footer-tag">Urembo wako, Kujiamini kwako</p>' +
          '</div>' +
        '</div>' +
        '<div class="emish-footer-cols">' +
          '<div><p class="emish-footer-h">Explore</p>' +
            '<a href="products.html">Shop</a>' +
            '<a href="services.html">Services</a>' +
            '<a href="booking.html">Book</a>' +
            '<a href="referral.html">Refer & Earn</a></div>' +
          '<div><p class="emish-footer-h">Branches</p>' +
            '<span>Dar es Salaam — Sinza</span>' +
            '<span>Arusha — Njiro</span>' +
            '<span>Dodoma</span></div>' +
          '<div><p class="emish-footer-h">Contact</p>' +
            '<a href="tel:+255672283434">0672 283 434</a>' +
            '<a href="tel:+255746541544">0746 541 544</a>' +
            '<div class="emish-footer-social">' +
            '<a href="https://wa.me/255672283434" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.1-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.5-1-1-1.5-2-1.7-2.3-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.1-.3 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.2.7 2.6.6.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.6-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.8L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3.2.8.9-3.1-.2-.3C4.3 15 3.8 13.5 3.8 12 3.8 7.5 7.5 3.8 12 3.8S20.2 7.5 20.2 12 16.5 20.2 12 20.2z"/></svg></a>' +
            '<a href="https://instagram.com/emishbeautyspa" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-3.2 1.7-4.8 4.9-4.9 1.3-.1 1.7-.1 4.9-.1zm0 1.8c-3.2 0-3.5 0-4.8.1-2.2.1-3.3 1.2-3.4 3.4-.1 1.2-.1 1.5-.1 4.8s0 3.5.1 4.8c.1 2.2 1.2 3.3 3.4 3.4 1.2.1 1.6.1 4.8.1s3.5 0 4.8-.1c2.2-.1 3.3-1.2 3.4-3.4.1-1.2.1-1.6.1-4.8s0-3.5-.1-4.8c-.1-2.2-1.2-3.3-3.4-3.4-1.3-.1-1.6-.1-4.8-.1zm0 3.1a5 5 0 110 10 5 5 0 010-10zm0 1.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm5.2-.9a1.2 1.2 0 110 2.3 1.2 1.2 0 010-2.3z"/></svg></a>' +
            '<a href="tel:+255672283434" aria-label="Phone" title="Call">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg></a>' +
            '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="emish-footer-bottom">' +
        '<span>© ' + new Date().getFullYear() + ' Emish Beauty Spa · Tanzania</span>' +
        '<span>Pesapal · Bank · Till · Cash on delivery</span>' +
      '</div>';
    var slot = document.getElementById('site-footer');
    if (slot) slot.replaceWith(foot);
    else document.body.appendChild(foot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
