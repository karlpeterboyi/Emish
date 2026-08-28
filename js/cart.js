// Niffer Cosmetics - Cart & Order Management (localStorage based for prototype)

const CART_KEY = 'niffer_cart';
const USER_KEY = 'niffer_user';
const REFERRALS_KEY = 'niffer_referrals';
const ORDERS_KEY = 'niffer_orders';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId, qty = 1) {
  const product = getProductById(productId);
  if (!product) return;
  if (product.stock < 1) {
    alert(t('out_of_stock'));
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, product.stock);
  } else {
    cart.push({ id: productId, qty: Math.min(qty, product.stock) });
  }
  saveCart(cart);
  showToast(t('add_to_cart') + ' ✓');
}

function removeFromCart(productId) {
  let cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

function updateCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    const product = getProductById(productId);
    item.qty = Math.max(1, Math.min(qty, product ? product.stock : 99));
    if (item.qty < 1) removeFromCart(productId);
    else saveCart(cart);
  }
}

function getCartTotal() {
  return getCart().reduce((sum, item) => {
    const p = getProductById(item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (!el) return;
  const count = getCartCount();
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : count;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

// User / Auth (mock)
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(USER_KEY);
  window.location.href = 'account.html';
}

function generateReferralCode(name) {
  const base = (name || 'NIFFER').replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return base + rand;
}

// Referrals
function getReferrals() {
  try {
    return JSON.parse(localStorage.getItem(REFERRALS_KEY)) || [];
  } catch {
    return [];
  }
}

function addReferral(data) {
  const refs = getReferrals();
  refs.unshift({
    id: Date.now(),
    ...data,
    date: new Date().toISOString(),
    status: 'pending'
  });
  localStorage.setItem(REFERRALS_KEY, JSON.stringify(refs));
}

// Orders
function saveOrder(order) {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function getOrders() {
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
}

// Toast notification
function showToast(message, duration = 2500) {
  let toast = document.getElementById('niffer-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'niffer-toast';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary-800 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium transition-all opacity-0 translate-y-4';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('opacity-0', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, duration);
}

// Shipping calculation (simple prototype)
function calculateShipping(subtotal, city) {
  if (subtotal >= 50000) return 0; // Free over 50k
  const darCities = ['dar', 'dar es salaam', 'dsm', 'sinza', 'kinondoni', 'ilala', 'temeke', 'ubungo', 'kigamboni'];
  if (city && darCities.some(c => city.toLowerCase().includes(c))) return 3000;
  return 8000; // Upcountry
}
