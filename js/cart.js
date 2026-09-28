// Simple cart saved in the browser (localStorage).
// Only item id, size and quantity matter - the server re-checks prices.
const CART_KEY = 'droptop_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = getCart().reduce((sum, i) => sum + i.qty, 0);
}

function addToCart(id, name, size, price) {
  const cart = getCart();
  const existing = cart.find(i => i.id === id && i.size === size);
  if (existing) existing.qty++;
  else cart.push({ id, name, size, price, qty: 1 });
  saveCart(cart);
  showToast(name + (size ? ' (' + size + ')' : '') + ' added to cart');
}

// Used on the menu page (reads the selected pizza size if there is one)
function addFromMenu(id, name, basePrice) {
  const select = document.getElementById('size-' + id);
  if (select) {
    const opt = select.options[select.selectedIndex];
    addToCart(id, name, opt.value, parseInt(opt.dataset.price));
  } else {
    addToCart(id, name, '', basePrice);
  }
}

function updatePrice(id) {
  const select = document.getElementById('size-' + id);
  const price = select.options[select.selectedIndex].dataset.price;
  document.getElementById('price-' + id).textContent = 'Rs. ' + price;
}

function changeQty(index, change) {
  const cart = getCart();
  cart[index].qty += change;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

function clearCart() {
  if (confirm('Remove all items from cart?')) { saveCart([]); renderCart(); }
}

function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function escapeHtml(t) {
  const d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

function renderCart() {
  const cart = getCart();
  const box = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');
  if (cart.length === 0) {
    box.innerHTML = '<p class="center">Your cart is empty. <a href="menu.html">Browse the menu</a></p>';
    summary.style.display = 'none';
    return;
  }
  summary.style.display = 'block';
  box.innerHTML = cart.map((item, i) => `
    <div class="cart-row">
      <div class="cart-name">${escapeHtml(item.name)}${item.size ? ' <small>(' + escapeHtml(item.size) + ')</small>' : ''}
        <div class="muted">Rs. ${item.price} each</div></div>
      <div class="qty">
        <button onclick="changeQty(${i}, -1)">-</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${i}, 1)">+</button>
      </div>
      <div class="cart-price">Rs. ${item.price * item.qty}</div>
      <button class="remove" onclick="removeItem(${i})" title="Remove">&times;</button>
    </div>`).join('');
  document.getElementById('cart-total').textContent = 'Rs. ' + cartTotal(cart);
}

function renderCheckout() {
  const cart = getCart();
  if (cart.length === 0) { window.location = 'cart.html'; return; }
  document.getElementById('checkout-items').innerHTML = cart.map(i =>
    `<div class="line"><span>${i.qty} x ${escapeHtml(i.name)}${i.size ? ' (' + escapeHtml(i.size) + ')' : ''}</span><span>Rs. ${i.price * i.qty}</span></div>`
  ).join('');
  document.getElementById('checkout-total').textContent = 'Rs. ' + cartTotal(cart);
  toggleAddress();
}

function toggleAddress() {
  const type = document.getElementById('order_type').value;
  const box = document.getElementById('address-box');
  const addr = document.getElementById('address');
  box.style.display = type === 'Delivery' ? 'block' : 'none';
  addr.required = type === 'Delivery';
}


function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

document.addEventListener('DOMContentLoaded', updateCartCount);

const CATEGORIES = ['Pizza', 'Special Pizza', 'Burgers', 'Shawarma & Paratha', 'Sides & Snacks',
  'Regular Deals', 'Pizza Deals', 'Family Deals'];

function menuCard(item) {
  const hasSizes = item.price_medium !== null;

  const nameJs = JSON.stringify(item.name).replace(/'/g, "&#39;");

  return `<div class="menu-card">
    <h3>${escapeHtml(item.name)}</h3>

    ${item.description ? `<p class="desc">${escapeHtml(item.description)}</p>` : ''}

    ${hasSizes ? `
      <select id="size-${item.id}" onchange="updatePrice(${item.id})">
        <option value="Small" data-price="${item.price}">
          Small 8" - Rs. ${item.price}
        </option>
        <option value="Medium" data-price="${item.price_medium}">
          Medium 12" - Rs. ${item.price_medium}
        </option>
        <option value="Large" data-price="${item.price_large}">
          Large 14" - Rs. ${item.price_large}
        </option>
        <option value="X-Large" data-price="${item.price_xl}">
          X-Large - Rs. ${item.price_xl}
        </option>
      </select>
    ` : ''}

    <div class="card-bottom">
      <span class="price" id="price-${item.id}">
        Rs. ${item.price}
      </span>

      <button
        class="btn btn-small"
        onclick='addFromMenu(${item.id}, ${nameJs}, ${item.price})'>
        Add to Cart
      </button>
    </div>
  </div>`;
}

async function loadMenu() {
  const params = new URLSearchParams(location.search);
  let selected = params.get('category') || 'All';
  if (!CATEGORIES.includes(selected)) selected = 'All';
  document.getElementById('filters').innerHTML =
    ['All', ...CATEGORIES].map(c => `<a href="menu.html${c === 'All' ? '' : '?category=' + encodeURIComponent(c)}" class="${c === selected ? 'active' : ''}">${escapeHtml(c)}</a>`).join('');
  const box = document.getElementById('menu-box');
  let q = db.from('menu_items').select('*').eq('is_available', true).order('id');
  if (selected !== 'All') q = q.eq('category', selected);
  const { data, error } = await q;
  if (error) { box.innerHTML = '<div class="alert error">Could not load the menu. Please refresh.</div>'; return; }
  if (!data.length) { box.innerHTML = '<p class="center">No items found.</p>'; return; }
  const groups = {};
  data.forEach(i => (groups[i.category] = groups[i.category] || []).push(i));
  box.innerHTML = CATEGORIES.filter(c => groups[c]).map(c =>
    `<h2 class="section-title">${escapeHtml(c)}</h2><div class="menu-grid">${groups[c].map(menuCard).join('')}</div>`).join('');
}

async function loadHomeDeals() {
  const { data } = await db.from('menu_items').select('*').eq('category', 'Family Deals').eq('is_available', true).order('price').limit(3);
  document.getElementById('deals').innerHTML = (data || []).map(menuCard).join('');
}

async function placeOrder(ev) {
  ev.preventDefault();
  const cart = getCart();
  const btn = document.getElementById('place-btn');
  const err = document.getElementById('checkout-error');
  err.classList.add('hidden');
  if (!cart.length) { alert('Your cart is empty.'); return; }
  const f = ev.target;
  btn.disabled = true; btn.textContent = 'Placing order...';
  const { data, error } = await db.rpc('place_order', {
    p_name: f.customer_name.value, p_phone: f.phone.value, p_address: f.address.value,
    p_type: f.order_type.value, p_notes: f.notes.value,
    p_items: cart.map(i => ({ id: i.id, size: i.size, qty: i.qty }))
  });
  if (error || !data) {
    err.textContent = (error && error.message) || 'Could not place your order. Please try again.';
    err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Place Order';
    return;
  }
  // Only reached after the database saved the order
  localStorage.removeItem(CART_KEY);
  location.href = 'order-success.html?id=' + data;
}
