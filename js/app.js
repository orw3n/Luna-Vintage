/* Simple e-shop front-end */
const PRODUCTS_URL = 'products.json';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart_v1') || '{}'); // { productId: qty }

/* Helpers */
const € = v => v.toFixed(2).replace('.', ',') + ' €';
const el = sel => document.querySelector(sel);
const elAll = sel => Array.from(document.querySelectorAll(sel));

/* UI elements */
const productsEl = el('#products');
const cartBtn = el('#cart-btn');
const cartCountEl = el('#cart-count');
const cartDrawer = el('#cart-drawer');
const cartItemsEl = el('#cart-items');
const subtotalEl = el('#subtotal');
const toast = el('#toast');
const searchInput = el('#search');
const checkoutSection = el('#checkout');
const goCheckoutBtn = el('#go-checkout');
const clearCartBtn = el('#clear-cart');
const closeCartBtn = el('#close-cart');
const cancelCheckoutBtn = el('#cancel-checkout');
const checkoutForm = el('#checkout-form');
const orderSummary = el('#order-summary');

/* Load products */
async function loadProducts(){
  try{
    const res = await fetch(PRODUCTS_URL);
    products = await res.json();
    renderProducts(products);
    updateCartCount();
  }catch(e){
    showToast('Impossible de charger les produits.');
    console.error(e);
  }
}

function renderProducts(list){
  productsEl.innerHTML = '';
  if (!list.length) {
    productsEl.innerHTML = '<p>Aucun produit trouvé.</p>';
    return;
  }
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}">
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="price">${€(p.price)}</div>
        <div class="actions">
          <button class="btn" data-id="${p.id}" data-action="quick">Voir</button>
          <button class="btn primary" data-id="${p.id}" data-action="add">Ajouter</button>
        </div>
      </div>
    `;
    productsEl.appendChild(card);
  });
}

/* Cart management */
function saveCart(){
  localStorage.setItem('cart_v1', JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

function updateCartCount(){
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  cartCountEl.textContent = count;
}

function addToCart(id, qty = 1){
  cart[id] = (cart[id] || 0) + qty;
  saveCart();
  showToast('Ajouté au panier');
}

function removeFromCart(id){
  delete cart[id];
  saveCart();
}

function changeQty(id, qty){
  if (qty <= 0) removeFromCart(id);
  else cart[id] = qty;
  saveCart();
}

function clearCart(){
  cart = {};
  saveCart();
}

/* Render cart */
function renderCart(){
  cartItemsEl.innerHTML = '';
  const entries = Object.entries(cart);
  if(!entries.length){
    cartItemsEl.innerHTML = '<p>Ton panier est vide.</p>';
    subtotalEl.textContent = €(0);
    return;
  }
  let subtotal = 0;
  entries.forEach(([id, qty]) => {
    const prod = products.find(p => p.id === id);
    if(!prod) return;
    const line = document.createElement('div');
    line.className = 'cart-item';
    line.innerHTML = `
      <img src="${prod.image}" alt="${prod.title}">
      <div class="meta">
        <div style="font-weight:700">${prod.title}</div>
        <div style="color:#666">${€(prod.price)} x ${qty}</div>
        <div class="qty-controls">
          <button class="btn" data-id="${id}" data-action="dec">−</button>
          <span style="padding:6px 8px">${qty}</span>
          <button class="btn" data-id="${id}" data-action="inc">+</button>
          <button class="btn" data-id="${id}" data-action="del">Supprimer</button>
        </div>
      </div>
    `;
    cartItemsEl.appendChild(line);
    subtotal += prod.price * qty;
  });
  subtotalEl.textContent = €(subtotal);
}

/* Small UI utilities */
function showToast(msg, time=2000){
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(()=>toast.style.display='none', time);
}

/* Events */
document.addEventListener('click', (e) => {
  const a = e.target.closest('button');
  if(!a) return;

  const action = a.dataset.action;
  const id = a.dataset.id;

  // Add product from product list
  if(action === 'add'){
    addToCart(id, 1);
  }

  // Quick view (for now, scroll to product)
  if(action === 'quick'){
    showToast('Fonction "Voir" non-implémentée — future mise à jour');
  }

  // Cart quantity controls
  if(['inc','dec','del'].includes(action)){
    if(action === 'inc') changeQty(id, (cart[id] || 0) + 1);
    if(action === 'dec') changeQty(id, (cart[id] || 0) - 1);
    if(action === 'del') removeFromCart(id);
  }
});

cartBtn.addEventListener('click', () => {
  const hidden = cartDrawer.getAttribute('aria-hidden') === 'true' || !cartDrawer.hasAttribute('aria-hidden');
  cartDrawer.setAttribute('aria-hidden', String(!hidden));
  cartDrawer.style.display = hidden ? 'block' : 'none';
  renderCart();
});

closeCartBtn.addEventListener('click', () => {
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartDrawer.style.display = 'none';
});

clearCartBtn.addEventListener('click', () => {
  if(confirm('Vider le panier ?')) clearCart();
});

goCheckoutBtn.addEventListener('click', () => {
  // hide drawer, show checkout section
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartDrawer.style.display = 'none';
  showCheckout();
});

cancelCheckoutBtn.addEventListener('click', () => {
  checkoutSection.classList.add('hidden');
});

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = products.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  renderProducts(filtered);
});

/* Checkout */
function showCheckout(){
  const entries = Object.entries(cart);
  if(!entries.length){
    alert('Votre panier est vide.');
    return;
  }
  // Fill summary
  const summary = entries.map(([id, qty]) => {
    const p = products.find(x=>x.id===id);
    return `<div style="display:flex;justify-content:space-between;padding:6px 0"><div>${p.title} × ${qty}</div><div>${€(p.price*qty)}</div></div>`;
  }).join('');
  const total = entries.reduce((s,[id,qty]) => {
    const p = products.find(x=>x.id===id); return s + (p.price*qty);
  }, 0);
  orderSummary.innerHTML = `<h3>Récapitulatif</h3>${summary}<hr><div style="text-align:right;font-weight:700">Total: ${€(total)}</div>`;
  checkoutSection.classList.remove('hidden');
  window.scrollTo({top: checkoutSection.offsetTop - 20, behavior:'smooth'});
}

checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(checkoutForm);
  const name = formData.get('name'), email = formData.get('email');
  if(!name || !email){ showToast('Remplis les champs requis'); return; }
  // Simulate order
  const orderId = 'CMD' + Math.random().toString(36).slice(2,9).toUpperCase();
  // "send" order (here just simulate)
  clearCart();
  checkoutForm.reset();
  checkoutSection.classList.add('hidden');
  showToast('Commande confirmée — ' + orderId, 4000);
  alert(`Merci ${name} !\nCommande ${orderId} confirmée.\nUn email de confirmation a été envoyé à ${email} (simulation).`);
});

/* Init */
loadProducts().then(()=>renderCart());

