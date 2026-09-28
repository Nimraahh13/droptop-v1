// Owner panel helpers
const STATUSES = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
function esc(t) { const d = document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; }
function fmtDate(d) { return new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }); }

// Every owner page calls this first. Sends non-owners back to the login page.
async function requireAdmin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'login.html'; return null; }
  const { data } = await db.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (!data) { await db.auth.signOut(); location.href = 'login.html?denied=1'; return null; }
  document.getElementById('admin-bar').innerHTML = `<div class="container admin-bar-inner">
    <b>Drop &amp; Top – Owner Panel</b>
    <span><a href="index.html">Orders</a><a href="menu.html">Menu</a><a href="#" onclick="logout();return false">Logout</a></span></div>`;
  document.getElementById('admin-main').classList.remove('hidden');
  return session.user;
}
async function logout() { await db.auth.signOut(); location.href = 'login.html'; }

async function login(ev) {
  ev.preventDefault();
  const f = ev.target, err = document.getElementById('login-error');
  err.classList.add('hidden');
  const { error } = await db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
  if (error) { err.textContent = 'Wrong email or password.'; err.classList.remove('hidden'); return; }
  location.href = 'index.html';
}

// ---------- Orders dashboard ----------
let lastSeenId = Number(localStorage.getItem('droptop_last_seen') || 0);
async function loadOrders() {
  const filter = new URLSearchParams(location.search).get('status') || 'All';
  document.getElementById('filters').innerHTML = ['All', ...STATUSES].map(s =>
    `<a href="${s === 'All' ? 'index.html' : '?status=' + s}" class="${s === filter ? 'active' : ''}">${s}</a>`).join('');
  let q = db.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (STATUSES.includes(filter)) q = q.eq('status', filter);
  const { data: orders, error } = await q;
  const body = document.getElementById('orders-body');
  if (error) { body.innerHTML = '<tr><td colspan="8">Could not load orders.</td></tr>'; return; }

  const { data: all } = await db.from('orders').select('id,total,status,created_at');
  const today = new Date().toDateString();
  const todays = (all || []).filter(o => new Date(o.created_at).toDateString() === today);
  document.getElementById('st-pending').textContent = (all || []).filter(o => o.status === 'Pending').length;
  document.getElementById('st-today').textContent = todays.length;
  document.getElementById('st-sales').textContent = 'Rs. ' + todays.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
  document.getElementById('st-all').textContent = (all || []).length;

  const maxId = Math.max(0, ...(all || []).map(o => o.id));
  const newCount = (all || []).filter(o => o.id > lastSeenId).length;
  const banner = document.getElementById('new-banner');
  if (newCount && lastSeenId) { banner.textContent = `🔔 ${newCount} new order(s)!`; banner.classList.remove('hidden'); document.title = `(${newCount}) New Orders`; }

  body.innerHTML = orders.length ? orders.map(o => `<tr>
    <td>#${o.id}${o.id > lastSeenId && lastSeenId ? '<span class="new-dot">NEW</span>' : ''}</td>
    <td>${esc(o.customer_name)}</td><td><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></td>
    <td>${esc(o.order_type)}${o.address ? '<br><small>' + esc(o.address) + '</small>' : ''}</td>
    <td>Rs. ${o.total}</td><td>${fmtDate(o.created_at)}</td>
    <td><select onchange="setStatus(${o.id}, this.value)">${STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><a class="btn btn-small" href="order.html?id=${o.id}">View</a></td></tr>`).join('')
    : '<tr><td colspan="8" class="center">No orders yet.</td></tr>';
  if (!lastSeenId) { lastSeenId = maxId; localStorage.setItem('droptop_last_seen', maxId); }
}
function markSeen() {
  db.from('orders').select('id').order('id', { ascending: false }).limit(1).then(({ data }) => {
    lastSeenId = data && data[0] ? data[0].id : 0; localStorage.setItem('droptop_last_seen', lastSeenId);
    document.getElementById('new-banner').classList.add('hidden'); document.title = 'Orders | Owner Panel'; loadOrders();
  });
}
async function setStatus(id, status) {
  if (!STATUSES.includes(status)) return;
  const { error } = await db.from('orders').update({ status }).eq('id', id);
  alert(error ? 'Could not update status.' : `Order #${id} is now ${status}`);
}

// ---------- Single order ----------
async function loadOrder() {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const box = document.getElementById('order-box');
  const { data: o } = await db.from('orders').select('*').eq('id', id).maybeSingle();
  if (!o) { box.innerHTML = '<p>Order not found.</p>'; return; }
  const { data: items } = await db.from('order_items').select('*').eq('order_id', id).order('id');
  box.innerHTML = `<h1 class="page-title">Order #${o.id}</h1>
    <p><b>Customer:</b> ${esc(o.customer_name)}<br><b>Phone:</b> <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a><br>
    <b>Type:</b> ${esc(o.order_type)}<br>${o.address ? '<b>Address:</b> ' + esc(o.address) + '<br>' : ''}
    ${o.notes ? '<b>Notes:</b> ' + esc(o.notes) + '<br>' : ''}<b>Date:</b> ${fmtDate(o.created_at)}<br>
    <b>Status:</b> <select onchange="setStatus(${o.id}, this.value)">${STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></p>
    <div class="table-wrap"><table><tr><th>Item</th><th>Size</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr>
    ${items.map(i => `<tr><td>${esc(i.item_name)}</td><td>${esc(i.size)}</td><td>Rs. ${i.price}</td><td>${i.quantity}</td><td>Rs. ${i.price * i.quantity}</td></tr>`).join('')}
    <tr><th colspan="4">Total</th><th>Rs. ${o.total}</th></tr></table></div>
    <p><button class="btn" onclick="window.print()">Print</button> <a class="btn btn-outline" href="index.html">Back</a></p>`;
}

// ---------- Menu editor ----------
async function loadMenuAdmin() {
  const { data } = await db.from('menu_items').select('*').order('id');
  document.getElementById('menu-body').innerHTML = (data || []).map(m => `<tr>
    <td>${esc(m.category)}</td><td>${esc(m.name)}</td>
    <td><input type="number" min="1" id="p-${m.id}" value="${m.price}" style="width:90px"></td>
    <td>${m.price_medium !== null ? `M <input type="number" id="pm-${m.id}" value="${m.price_medium}" style="width:80px"> L <input type="number" id="pl-${m.id}" value="${m.price_large}" style="width:80px"> XL <input type="number" id="px-${m.id}" value="${m.price_xl}" style="width:80px">` : '-'}</td>
    <td>${m.is_available ? 'Shown' : '<b>Hidden</b>'}</td>
    <td><button class="btn btn-small" onclick="savePrice(${m.id}, ${m.price_medium !== null})">Save</button>
      <button class="btn btn-small btn-outline" onclick="toggleItem(${m.id}, ${!m.is_available})">${m.is_available ? 'Hide' : 'Show'}</button></td></tr>`).join('');
}
async function savePrice(id, sized) {
  const v = k => parseInt(document.getElementById(k + '-' + id).value);
  const upd = { price: v('p') };
  if (sized) Object.assign(upd, { price_medium: v('pm'), price_large: v('pl'), price_xl: v('px') });
  if (Object.values(upd).some(x => !(x > 0))) return alert('Prices must be numbers above 0.');
  const { error } = await db.from('menu_items').update(upd).eq('id', id);
  alert(error ? 'Could not save.' : 'Saved.');
}
async function toggleItem(id, show) {
  await db.from('menu_items').update({ is_available: show }).eq('id', id); loadMenuAdmin();
}
async function addItem(ev) {
  ev.preventDefault(); const f = ev.target;
  const price = parseInt(f.price.value);
  if (!f.name.value.trim() || !(price > 0)) return alert('Enter a name and price.');
  const { error } = await db.from('menu_items').insert({ category: f.category.value, name: f.name.value.trim(), description: f.description.value.trim(), price });
  if (error) return alert('Could not add item.');
  f.reset(); loadMenuAdmin();
}


// ---------- Free browser alert (live, no reload needed) ----------
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.3, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch (e) {}
}
function enableAlerts() {
  if (!('Notification' in window)) { alert('This browser does not support alerts. The sound will still play.'); beep(); return; }
  Notification.requestPermission().then(p => { updateAlertButton(); if (p === 'granted') beep(); });
}
function updateAlertButton() {
  const b = document.getElementById('alert-btn'); if (!b) return;
  const ok = 'Notification' in window && Notification.permission === 'granted';
  b.textContent = ok ? '\u{1F514} Alerts ON' : '\u{1F515} Turn on order alerts';
  b.disabled = ok;
}
function startLiveOrders() {
  updateAlertButton();
  db.channel('new-orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
      const o = payload.new;
      beep();
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('New order #' + o.id, { body: o.customer_name + ' - ' + o.order_type, icon: '../images/logo.png' });
        n.onclick = () => { window.focus(); location.href = 'order.html?id=' + o.id; };
      }
      setTimeout(loadOrders, 1500);
    })
    .subscribe();
}
