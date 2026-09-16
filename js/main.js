/* ============================================
   ELEVATED PICKLEBALL — MAIN JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── NAV SCROLL ──
  const nav = document.getElementById('nav');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);

    // Active nav link
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 130) current = s.id;
    });
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}` ||
        a.getAttribute('href') === `${window.location.pathname}#${current}`);
    });
  }, { passive: true });

  // ── HAMBURGER ──
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ── SCROLL REVEAL ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    observer.observe(el);
  });

  // ── SMOOTH ANCHOR SCROLL ──
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── PADDLE COLOR TOGGLE ──
  window.switchHeroColor = function(color, btn) {
    const img = document.getElementById('heroPaddleImg');
    if (!img) return;
    img.src = color === 'white' ? img.dataset.white : img.dataset.black;
    document.querySelectorAll('.hero-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  window.switchCardColor = function(cardId, color, dot) {
    const img = document.getElementById(`card${cardId}Img`);
    if (!img) return;
    img.src = color === 'white' ? img.dataset.white : img.dataset.black;
    dot.closest('.pc-colorways').querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
  };

});

// ── GLOBAL HELPERS ──
window.openCart = function() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeCart = function() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
};

window.openCheckout = function() {
  if (!window.cart || window.cart.length === 0) return;
  closeCart();
  populateCheckoutSummary();
  document.getElementById('checkoutModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => window.initStripe && window.initStripe(), 150);
};

window.closeCheckout = function() {
  document.getElementById('checkoutModal').classList.remove('open');
  document.body.style.overflow = '';
};

function populateCheckoutSummary() {
  const summaryEl = document.getElementById('checkoutSummary');
  const totalEl = document.getElementById('checkoutTotal');
  if (!summaryEl || !window.cart) return;

  summaryEl.innerHTML = window.cart.map(item => `
    <div class="checkout-line">
      <span>${item.name} × ${item.qty}</span>
      <span>${window.formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('') + `
    <div class="checkout-line" style="color:rgba(255,255,255,0.35)">
      <span>Shipping</span><span>Calculated after checkout</span>
    </div>
  `;

  if (totalEl) totalEl.textContent = window.formatPrice(window.getTotal());
}
