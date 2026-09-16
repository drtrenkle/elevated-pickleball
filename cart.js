/* ============================================
   ELEVATED PICKLEBALL — CART & CHECKOUT
   Stripe Payment Integration
   ============================================ */

// ── STRIPE CONFIG ──
// Replace with Geoff's actual publishable key from stripe.com/dashboard
const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_KEY_HERE';

// Product catalog with Stripe Price IDs
// Create these in Stripe Dashboard → Products
const PRODUCTS = {
  'apex-air-white': {
    name: 'Apex Air — White',
    price: 17999, // cents
    display: '$179.99',
    stripePriceId: 'price_REPLACE_WHITE',
  },
  'apex-air-black': {
    name: 'Apex Air — Black',
    price: 17999,
    display: '$179.99',
    stripePriceId: 'price_REPLACE_BLACK',
  },
};

// ── CART STATE ──
let cart = JSON.parse(localStorage.getItem('ep_cart') || '[]');
let stripe = null;
let elements = null;
let cardElement = null;

function saveCart() {
  localStorage.setItem('ep_cart', JSON.stringify(cart));
  updateCartUI();
}

// ── ADD TO CART ──
function addToCart(productId, colorway, name, price, imgSrc) {
  const id = `${productId}-${colorway}`;
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, productId, colorway, name, price, imgSrc, qty: 1 });
  }
  saveCart();
  showToast(`${name} added to cart`);
  openCart();
}

// ── REMOVE FROM CART ──
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else saveCart();
}

function getTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// ── CART UI ──
function updateCartUI() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  const countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.textContent = total;
    countEl.classList.toggle('visible', total > 0);
  }

  renderCartItems();

  const subtotalEl = document.getElementById('cartSubtotal');
  if (subtotalEl) subtotalEl.textContent = formatPrice(getTotal());
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🏓</div>
        <p>Your cart is empty</p>
        <button class="btn btn-outline" style="margin-top:1rem;font-size:0.7rem;padding:0.75rem 1.5rem;" onclick="closeCart()">Continue Shopping</button>
      </div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${item.imgSrc}" alt="${item.name}">
      </div>
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-variant">${item.colorway} Colorway</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateQty('${item.id}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}',1)">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
      <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
    </div>
  `).join('');
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── STRIPE CHECKOUT ──
async function initStripe() {
  if (typeof Stripe === 'undefined') return;
  try {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    elements = stripe.elements({
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#c9b96a',
          colorBackground: '#141414',
          colorText: '#ffffff',
          colorDanger: '#e05a5a',
          fontFamily: 'Barlow, sans-serif',
          borderRadius: '2px',
        }
      }
    });
    cardElement = elements.create('card', {
      style: {
        base: {
          color: '#ffffff',
          fontFamily: 'Barlow, sans-serif',
          fontSize: '16px',
          '::placeholder': { color: 'rgba(255,255,255,0.3)' }
        }
      }
    });
    const mountEl = document.getElementById('cardElement');
    if (mountEl) {
      cardElement.mount('#cardElement');
      cardElement.on('focus', () => document.getElementById('cardWrap')?.classList.add('focused'));
      cardElement.on('blur', () => document.getElementById('cardWrap')?.classList.remove('focused'));
    }
  } catch(e) {
    console.log('Stripe not initialized:', e.message);
  }
}

function openCheckout() {
  if (cart.length === 0) return;
  closeCart();

  // Populate order summary
  const summaryEl = document.getElementById('checkoutSummary');
  if (summaryEl) {
    summaryEl.innerHTML = cart.map(item => `
      <div class="checkout-line">
        <span>${item.name} × ${item.qty}</span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>
    `).join('') + `
      <div class="checkout-line" style="color:rgba(255,255,255,0.4)">
        <span>Shipping</span><span>Calculated at checkout</span>
      </div>
    `;
  }

  const totalEl = document.getElementById('checkoutTotal');
  if (totalEl) totalEl.textContent = formatPrice(getTotal());

  document.getElementById('checkoutModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  setTimeout(initStripe, 100);
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function handleCheckout(e) {
  e.preventDefault();

  const btn = document.getElementById('checkoutSubmitBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span style="animation:spin 0.8s linear infinite;display:inline-block">⟳</span> Processing...';

  // If Stripe is initialized, process payment
  if (stripe && cardElement) {
    const name = document.getElementById('chk-name').value;
    const email = document.getElementById('chk-email').value;

    try {
      // Create Stripe Checkout Session (requires backend)
      // For now, redirect to Stripe Payment Link or show success
      // TO CONNECT: Set up a Netlify/Vercel function to create PaymentIntent
      
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name, email },
      });

      if (error) {
        showError(error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
        return;
      }

      // SUCCESS — in production, send paymentMethod.id to your backend
      showOrderSuccess(email);

    } catch(err) {
      showError('Payment failed. Please try again.');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } else {
    // Stripe not loaded — show demo success
    setTimeout(() => {
      const email = document.getElementById('chk-email')?.value || 'your email';
      showOrderSuccess(email);
    }, 1500);
  }
}

function showOrderSuccess(email) {
  const form = document.getElementById('checkoutForm');
  const success = document.getElementById('checkoutSuccess');
  if (form) form.style.display = 'none';
  if (success) {
    success.classList.add('visible');
    const emailEl = document.getElementById('successEmail');
    if (emailEl) emailEl.textContent = email;
  }
  cart = [];
  saveCart();
}

function showError(msg) {
  const errEl = document.getElementById('paymentError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}

// ── TOAST ──
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastText').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('checkoutModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('checkoutModal')) closeCheckout();
  });
});
