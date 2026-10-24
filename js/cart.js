// Emish Beauty Spa — Cart (localStorage)
const CART_KEY = 'emish_cart';
const CART_KEY_OLD = 'niffer_cart';

function getCart() {
  try {
    var raw = localStorage.getItem(CART_KEY) || localStorage.getItem(CART_KEY_OLD);
    var cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  try { localStorage.removeItem(CART_KEY_OLD); } catch (e) {}
  updateCartCount();
  // Notify other UI on same page
  try {
    window.dispatchEvent(new CustomEvent('emish-cart-updated', { detail: { count: getCartCount() } }));
  } catch (e) {}
}

function sameId(a, b) {
  return String(a) === String(b);
}

function addToCart(productId, qty) {
  qty = parseInt(qty, 10) || 1;
  if (qty < 1) qty = 1;

  var product = null;
  if (typeof getProductById === 'function') product = getProductById(productId);
  if (!product && typeof products !== 'undefined') {
    product = products.find(function (p) { return sameId(p.id, productId) || p.slug === productId; });
  }
  if (!product && window.EMISH_CATALOG) {
    product = window.EMISH_CATALOG.find(function (p) { return sameId(p.id, productId) || p.slug === productId; });
  }
  if (!product) {
    alert('Product not found — open it from Shop first, then add again.');
    return false;
  }
  var stock = product.stock != null ? product.stock : 99;
  if (stock < 1) {
    alert((typeof t === 'function' ? t('out_of_stock') : 'Out of stock'));
    return false;
  }

  var cart = getCart();
  var existing = cart.find(function (item) { return sameId(item.id, product.id); });
  if (existing) {
    existing.qty = Math.min((existing.qty || 0) + qty, stock);
  } else {
    cart.push({
      id: product.id,
      slug: product.slug || '',
      name: (product.name && product.name.en) || product.nameEn || 'Product',
      price: product.price,
      image: product.image || '',
      qty: Math.min(qty, stock)
    });
  }
  saveCart(cart);
  showToast((typeof t === 'function' ? t('add_to_cart') : 'Added') + ' ✓');
  return true;
}

function removeFromCart(productId) {
  saveCart(getCart().filter(function (item) { return !sameId(item.id, productId); }));
}

function updateCartQty(productId, qty) {
  qty = parseInt(qty, 10) || 1;
  var cart = getCart();
  var item = cart.find(function (i) { return sameId(i.id, productId); });
  if (!item) return;
  if (qty < 1) {
    removeFromCart(productId);
    return;
  }
  var product = typeof getProductById === 'function' ? getProductById(productId) : null;
  var max = product && product.stock != null ? product.stock : 99;
  item.qty = Math.min(qty, max);
  saveCart(cart);
}

function getCartTotal() {
  return getCart().reduce(function (sum, item) {
    var price = item.price;
    if (price == null && typeof getProductById === 'function') {
      var p = getProductById(item.id);
      price = p ? p.price : 0;
    }
    return sum + (Number(price) || 0) * (item.qty || 0);
  }, 0);
}

function getCartCount() {
  return getCart().reduce(function (sum, item) { return sum + (item.qty || 0); }, 0);
}

function updateCartCount() {
  var count = getCartCount();
  document.querySelectorAll('#cartCount, .cart-count').forEach(function (el) {
    if (count > 0) {
      el.textContent = count > 99 ? '99+' : String(count);
      el.classList.remove('hidden');
      el.style.display = '';
    } else {
      el.textContent = '0';
      el.classList.add('hidden');
    }
  });
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(CART_KEY_OLD);
  updateCartCount();
}

function showToast(msg) {
  var toast = document.getElementById('emish-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'emish-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#be185d;color:#fff;padding:12px 20px;border-radius:999px;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2)';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { toast.style.display = 'none'; }, 2200);
}

function formatPrice(n) {
  try {
    return new Intl.NumberFormat('en-TZ').format(n) + ' TZS';
  } catch (e) {
    return n + ' TZS';
  }
}

// Auto-update badge when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateCartCount);
} else {
  updateCartCount();
}
