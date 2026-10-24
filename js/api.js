/**
 * Emish Beauty Spa - API Client
 * Talks to the backend at http://localhost:4000 (or configured API_URL)
 * Falls back gracefully when backend is offline.
 */

const API_BASE = localStorage.getItem('niffer_api_url') || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('niffer_token');
}

function setAuth(token, user) {
  if (token) localStorage.setItem('niffer_token', token);
  if (user) localStorage.setItem('niffer_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('niffer_token');
  localStorage.removeItem('niffer_user');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    // Network error or backend down
    if (err.name === 'TypeError' || err.message.includes('Failed to fetch')) {
      err.isNetwork = true;
    }
    throw err;
  }
}

// Auth — plain script (not ES module) so window.NifferAPI is always available
const api = {
  async register({ name, phone, password, email, referralCode }) {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, password, email, referralCode }),
    });
    if (res.data?.token) setAuth(res.data.token, res.data.user);
    return res;
  },

  async login({ phone, password }) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    if (res.data?.token) setAuth(res.data.token, res.data.user);
    return res;
  },

  async me() {
    return request('/auth/me');
  },

  logout() {
    clearAuth();
  },

  // Products
  async getProducts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? '?' + q : ''}`);
  },

  async getProduct(slug) {
    return request(`/products/${slug}`);
  },

  async getCategories() {
    return request('/products/meta/categories');
  },

  // Orders
  async createOrder(payload) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyOrders() {
    return request('/orders/my');
  },

  async getOrder(orderNumber) {
    return request(`/orders/${orderNumber}`);
  },

  // Payments
  async initiateBookingPayment(bookingNumber) {
    return request('/payments/initiate-booking', {
      method: 'POST',
      body: JSON.stringify({ bookingNumber }),
    });
  },

  async initiatePayment(orderNumber) {
    return request('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ orderNumber }),
    });
  },

  async getPaymentStatus(orderNumber) {
    return request(`/payments/status/${orderNumber}`);
  },

  // Referrals
  async getReferralDashboard() {
    return request('/referrals/dashboard');
  },

  // Admin
  async adminDashboard() {
    return request('/admin/dashboard');
  },

  async adminOrders(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/orders${q ? '?' + q : ''}`);
  },

  async updateOrderStatus(id, status) {
    return request(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async adminProducts() {
    return request('/admin/products');
  },

  async updateStock(id, stock) {
    return request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  },


  async getServices(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/services${q ? '?' + q : ''}`);
  },
  async getService(slug) {
    return request(`/services/${slug}`);
  },
  async createBooking(payload) {
    return request('/bookings', { method: 'POST', body: JSON.stringify(payload) });
  },
  async lookupBooking(number, phone) {
    return request(`/bookings/lookup?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`);
  },
  // Health
  async health() {
    return request('/health'.replace('/api/health', '/health').replace('/api', '') || '/health').catch(() =>
      fetch(`${API_BASE.replace('/api', '')}/api/health`).then(r => r.json())
    );
  },
};

// Expose for non-module scripts
window.EmishAPI = api;
window.EmishAPI = api;
window.NifferAPI = api; // alias
window.NifferAuth = { getToken, setAuth, clearAuth, getUser: () => {
  try { return JSON.parse(localStorage.getItem('niffer_user')); } catch { return null; }
}};
