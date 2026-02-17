// ==================
// Helpers
// ==================
const $ = (q) => document.querySelector(q);
const fmtCLP = (n) => Number(n).toLocaleString("es-CL", { style: "currency", currency: "CLP" });

const CART_KEY = "cart_v1";

function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) ?? []; }
  catch { return []; }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount(cart){
  return cart.reduce((acc, it) => acc + (it.qty || 0), 0);
}

// ==================
// WhatsApp (HERO + CARRITO)
// ==================
const WHATSAPP = "56972086522"; // sin + ni espacios

function abrirWhatsApp(mensaje){
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  // window.open puede bloquearse; esto casi nunca falla:
  window.location.href = url;
}

function mensajeGeneral(){
  return "Hola! 👋 Quiero cotizar un producto de Artesanía en Mimbre. ¿Me ayudas con stock y envío?";
}

function mensajeCarrito(cart){
  const items = cart.map(it =>
    `• ${it.name} x${it.qty} (${fmtCLP(it.price)} c/u) = ${fmtCLP(it.price * it.qty)}`
  ).join("\n");

  const subtotal = cart.reduce((acc, it) => acc + it.price * it.qty, 0);
  const shipping = subtotal >= 50000 ? 0 : 2500;
  const total = subtotal + shipping;

  return `Hola! 👋 Quiero cotizar mi carrito:

${items}

Subtotal: ${fmtCLP(subtotal)}
Envío: ${fmtCLP(shipping)}
Total: ${fmtCLP(total)}

¿Tienen stock y cuánto sale/demora el envío?`;
}

// ==================
// Productos (vienen de la API)
// ==================
let PRODUCTS = [];

async function loadProductsFromAPI(){
  const res = await fetch("/api/products");
  if(!res.ok) throw new Error("No se pudieron cargar productos");
  PRODUCTS = await res.json();
}

function getProduct(id){
  return PRODUCTS.find(p => String(p.id) === String(id));
}

// ==================
// Render Productos
// ==================
const grid = $("#productsGrid");
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");

function renderProducts(){
  const term = (searchInput.value || "").toLowerCase().trim();
  let list = PRODUCTS.filter(p => (p.name || "").toLowerCase().includes(term));

  const sort = sortSelect.value;
  if(sort === "price-asc") list.sort((a,b)=> a.price - b.price);
  if(sort === "price-desc") list.sort((a,b)=> b.price - a.price);

  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="card__img" style="background-image:url('${p.img}')"></div>
      <div class="card__body">
        <h3>${p.name}</h3>
        <p class="pMuted">${p.desc ?? ""}</p>
      </div>
      <div class="card__footer">
        <span class="price">${fmtCLP(p.price)}</span>
        <button class="btn btn--small" type="button" data-open="${p.id}">Ver</button>
      </div>
    </article>
  `).join("");
}

searchInput.addEventListener("input", renderProducts);
sortSelect.addEventListener("change", renderProducts);

// ==================
// Modal Detalle
// ==================
const modal = $("#productModal");
const closeModalBtn = $("#closeModalBtn");
const modalImg = $("#modalImg");
const modalTitle = $("#modalTitle");
const modalDesc = $("#modalDesc");
const modalPrice = $("#modalPrice");
const modalQty = $("#modalQty");
const decQty = $("#decQty");
const incQty = $("#incQty");
const addToCartFromModal = $("#addToCartFromModal");

let currentProductId = null;

function openModal(productId){
  const p = getProduct(productId);
  if(!p) return;

  currentProductId = productId;

  modalImg.src = p.img;
  modalImg.alt = p.name;
  modalTitle.textContent = p.name;
  modalDesc.textContent = p.desc ?? "";
  modalPrice.textContent = fmtCLP(p.price);
  modalQty.value = "1";

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  currentProductId = null;
}

closeModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e)=>{
  if(e.target?.dataset?.close === "true") closeModal();
});

decQty.addEventListener("click", ()=>{
  const v = Math.max(1, parseInt(modalQty.value || "1", 10) - 1);
  modalQty.value = String(v);
});
incQty.addEventListener("click", ()=>{
  const v = Math.min(99, parseInt(modalQty.value || "1", 10) + 1);
  modalQty.value = String(v);
});
modalQty.addEventListener("input", ()=>{
  let v = parseInt(modalQty.value || "1", 10);
  if(Number.isNaN(v)) v = 1;
  v = Math.min(99, Math.max(1, v));
  modalQty.value = String(v);
});

// abrir modal desde cards
grid.addEventListener("click", (e)=>{
  const btn = e.target.closest("[data-open]");
  if(!btn) return;
  openModal(btn.dataset.open);
});

// ==================
// Carrito (Drawer)
// ==================
const drawer = $("#cartDrawer");
const openCartBtn = $("#openCartBtn");
const closeCartBtn = $("#closeCartBtn");
const closeCartOverlay = $("#closeCartOverlay");

const cartItemsEl = $("#cartItems");
const cartCountEl = $("#cartCount");
const cartSubtotalEl = $("#cartSubtotal");
const cartShippingEl = $("#cartShipping");
const cartTotalEl = $("#cartTotal");

const clearCartBtn = $("#clearCartBtn");
const payBtn = $("#payBtn");

let cart = loadCart();

function openCart(){
  drawer.classList.add("show");
  drawer.setAttribute("aria-hidden", "false");
}
function closeCart(){
  drawer.classList.remove("show");
  drawer.setAttribute("aria-hidden", "true");
}

openCartBtn.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
closeCartOverlay.addEventListener("click", closeCart);

function addToCart(productId, qty){
  const p = getProduct(productId);
  if(!p) return;

  const existing = cart.find(it => String(it.id) === String(productId));
  if(existing) existing.qty += qty;
  else cart.push({ id: p.id, name: p.name, price: p.price, img: p.img, qty });

  saveCart(cart);
  renderCart();
}

addToCartFromModal.addEventListener("click", ()=>{
  if(!currentProductId) return;
  const qty = parseInt(modalQty.value || "1", 10) || 1;
  addToCart(currentProductId, qty);
  closeModal();
  openCart();
});

function removeFromCart(productId){
  cart = cart.filter(it => String(it.id) !== String(productId));
  saveCart(cart);
  renderCart();
}

function changeQty(productId, delta){
  const it = cart.find(x => String(x.id) === String(productId));
  if(!it) return;
  it.qty = Math.max(1, it.qty + delta);
  saveCart(cart);
  renderCart();
}

function renderCart(){
  cartCountEl.textContent = String(cartCount(cart));

  if(cart.length === 0){
    cartItemsEl.innerHTML = `<p class="pMuted">Tu carrito está vacío.</p>`;
  } else {
    cartItemsEl.innerHTML = cart.map(it => `
      <div class="pCartItem">
        <img class="pCartImg" src="${it.img}" alt="${it.name}">
        <div>
          <p class="pCartTitle">${it.name}</p>
          <div class="pCartMeta">${fmtCLP(it.price)} · Cant: ${it.qty}</div>
          <div class="pCartMeta">Subtotal: <strong>${fmtCLP(it.price * it.qty)}</strong></div>
        </div>
        <div class="pCartActions">
          <button class="pSmallBtn" type="button" data-dec="${it.id}">−</button>
          <button class="pSmallBtn" type="button" data-inc="${it.id}">+</button>
          <button class="pSmallBtn" type="button" data-remove="${it.id}">Quitar</button>
        </div>
      </div>
    `).join("");
  }

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shipping = subtotal >= 50000 ? 0 : 2500;
  const total = subtotal + shipping;

  cartSubtotalEl.textContent = fmtCLP(subtotal);
  cartShippingEl.textContent = fmtCLP(shipping);
  cartTotalEl.textContent = fmtCLP(total);
}

cartItemsEl.addEventListener("click", (e)=>{
  const dec = e.target.closest("[data-dec]")?.dataset.dec;
  const inc = e.target.closest("[data-inc]")?.dataset.inc;
  const rem = e.target.closest("[data-remove]")?.dataset.remove;

  if(dec) return changeQty(dec, -1);
  if(inc) return changeQty(inc, +1);
  if(rem) return removeFromCart(rem);
});

clearCartBtn.addEventListener("click", ()=>{
  cart = [];
  saveCart(cart);
  renderCart();
});

// Pago Webpay (backend)
payBtn.addEventListener("click", async ()=>{
  if(cart.length === 0){
    alert("Tu carrito está vacío.");
    return;
  }

  const payload = { cart: cart.map(it => ({ id: it.id, qty: it.qty })) };

  try{
    const res = await fetch("/api/checkout/webpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Error iniciando pago");

    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.url;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "token_ws";
    input.value = data.token;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();

  }catch(err){
    console.error(err);
    alert("No se pudo iniciar el pago: " + err.message);
  }
});

// ==================
// Listeners WhatsApp (HERO + CARRITO)
// ==================
document.addEventListener("DOMContentLoaded", () => {
  const btnHero = document.getElementById("whatsappModalBtn");
  if(btnHero){
    btnHero.addEventListener("click", () => {
      abrirWhatsApp(mensajeGeneral());
    });
  }

  const btnCart = document.getElementById("cartWhatsAppBtn");
  if(btnCart){
    btnCart.addEventListener("click", () => {
      if(!cart || cart.length === 0){
        alert("Tu carrito está vacío.");
        return;
      }
      abrirWhatsApp(mensajeCarrito(cart));
    });
  }
});

// ==================
// Init
// ==================
(async function init(){
  try{
    await loadProductsFromAPI();
    renderProducts();
    renderCart();
  }catch(err){
    console.error(err);
    $("#productsGrid").innerHTML =
      `<p class="pMuted">No se pudieron cargar productos. Revisa el servidor.</p>`;
  }
})();
