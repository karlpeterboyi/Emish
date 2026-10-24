// Emish Beauty Spa - Main App Logic

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  updateCartCount();
});

// Format currency helper already in products.js
