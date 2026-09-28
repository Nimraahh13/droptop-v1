// Shared header + footer for customer pages
const SHOP = {
  address: 'Near Haris Auto, Mohallah Chaudhrian, Chittarpari, Mirpur A.K',
  timing: '11:30 AM to 12:00 AM',
  phones: { Ali: ['0300-9132136', '0345-5470312'], Tahir: ['0306-8881757', '05827-207537'] }
};
function renderLayout() {
  const h = document.getElementById('site-header');
  if (h) h.innerHTML = `
  <header class="site-header"><div class="container nav">
    <a href="index.html" class="brand"><img src="images/logo.png" alt="Drop & Top logo"><span>Drop <b>&amp;</b> Top</span></a>
    <button class="menu-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')">&#9776;</button>
    <nav class="nav-links"><a href="index.html">Home</a><a href="menu.html">Menu</a><a href="contact.html">Contact</a>
      <a href="cart.html" class="cart-link">Cart <span id="cart-count">0</span></a></nav>
  </div></header>`;
  const f = document.getElementById('site-footer');
  if (f) f.innerHTML = `
  <footer class="site-footer"><div class="container footer-grid">
    <div><h3>Drop &amp; Top</h3><p>Pizza &amp; Fast Foods<br>Take Away &amp; Delivery</p></div>
    <div><h3>Visit Us</h3><p>${SHOP.address}<br>Open: ${SHOP.timing}</p></div>
    <div><h3>Call Us</h3>${Object.entries(SHOP.phones).map(([p, ns]) =>
      `<p><b>${p}:</b> ${ns.map(n => `<a href="tel:${n.replace(/-/g,'')}">${n}</a>`).join(' ')}</p>`).join('')}</div>
  </div><p class="copy">&copy; ${new Date().getFullYear()} Drop &amp; Top Pizza &amp; Fast Foods</p></footer>`;
  if (typeof updateCartCount === 'function') updateCartCount();
}
document.addEventListener('DOMContentLoaded', renderLayout);
