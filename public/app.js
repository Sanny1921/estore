// E-Store frontend: products, cart, and email OTP verification.
// Talks to the existing backend in server/index.js (/send-otp, /verify-otp).

const PRODUCTS = [
  { id: 1,  name: "Wireless Headphones",  price: 1499, emoji: "🎧", bg: "#e0e7ff", tag: "Electronics" },
  { id: 2,  name: "Smart Watch",          price: 2499, emoji: "⌚", bg: "#fef3c7", tag: "Electronics" },
  { id: 3,  name: "Bluetooth Speaker",    price: 999,  emoji: "🔊", bg: "#dcfce7", tag: "Electronics" },
  { id: 4,  name: "Running Shoes",        price: 1899, emoji: "👟", bg: "#fee2e2", tag: "Fashion" },
  { id: 5,  name: "Backpack",             price: 1199, emoji: "🎒", bg: "#ede9fe", tag: "Fashion" },
  { id: 6,  name: "Sunglasses",           price: 699,  emoji: "🕶️", bg: "#cffafe", tag: "Fashion" },
  { id: 7,  name: "Coffee Mug",           price: 349,  emoji: "☕", bg: "#fef9c3", tag: "Home" },
  { id: 8,  name: "Desk Lamp",            price: 899,  emoji: "💡", bg: "#fce7f3", tag: "Home" },
  { id: 9,  name: "Water Bottle",         price: 449,  emoji: "🥤", bg: "#e0f2fe", tag: "Home" },
  { id: 10, name: "Keyboard",             price: 1299, emoji: "⌨️", bg: "#f1f5f9", tag: "Electronics" },
  { id: 11, name: "Mouse",                price: 549,  emoji: "🖱️", bg: "#ecfccb", tag: "Electronics" },
  { id: 12, name: "Notebook Set",         price: 299,  emoji: "📓", bg: "#ffedd5", tag: "Stationery" },
];

const state = {
  cart: loadCart(),            // { [productId]: qty }
  email: localStorage.getItem("estore_email") || null,
  token: localStorage.getItem("estore_token") || null,
  pendingCheckout: false,
};

function loadCart() {
  try { return JSON.parse(localStorage.getItem("estore_cart")) || {}; }
  catch { return {}; }
}
function saveCart() { localStorage.setItem("estore_cart", JSON.stringify(state.cart)); }

const $ = (id) => document.getElementById(id);
const inr = (n) => "₹" + n.toLocaleString("en-IN");

/* ---------- Products ---------- */
function renderProducts(filter = "") {
  const grid = $("productGrid");
  const q = filter.trim().toLowerCase();
  const items = PRODUCTS.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q)
  );
  $("emptyMsg").hidden = items.length > 0;
  grid.innerHTML = items.map(p => `
    <div class="product-card">
      <div class="product-thumb" style="background:${p.bg}">${p.emoji}</div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.tag}</div>
        <div class="product-price-row">
          <span class="product-price">${inr(p.price)}</span>
          <button class="add-btn" data-add="${p.id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join("");
}

/* ---------- Cart ---------- */
function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, qty]) => ({ product: PRODUCTS.find(p => p.id === Number(id)), qty }))
    .filter(e => e.product && e.qty > 0);
}
function cartCount() { return cartEntries().reduce((s, e) => s + e.qty, 0); }
function cartTotal() { return cartEntries().reduce((s, e) => s + e.qty * e.product.price, 0); }

function renderCart() {
  $("cartCount").textContent = cartCount();
  const box = $("cartItems");
  const entries = cartEntries();
  if (!entries.length) {
    box.innerHTML = `<p class="cart-empty">Your cart is empty.<br>Add something you like.</p>`;
  } else {
    box.innerHTML = entries.map(({ product, qty }) => `
      <div class="cart-item">
        <div class="cart-item-thumb" style="background:${product.bg}">${product.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">${inr(product.price)} × ${qty}</div>
        </div>
        <div class="qty-controls">
          <button data-dec="${product.id}">−</button>
          <span>${qty}</span>
          <button data-inc="${product.id}">+</button>
        </div>
        <button class="remove-btn" data-remove="${product.id}" title="Remove">🗑</button>
      </div>
    `).join("");
  }
  $("cartTotal").textContent = inr(cartTotal());
  $("checkoutBtn").disabled = entries.length === 0;
}

function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  renderCart();
  const p = PRODUCTS.find(p => p.id === id);
  toast(`${p.name} added to cart`);
  const btn = document.querySelector(`[data-add="${id}"]`);
  if (btn) {
    btn.classList.add("added");
    btn.textContent = "Added ✓";
    setTimeout(() => { btn.classList.remove("added"); btn.textContent = "Add to Cart"; }, 900);
  }
}

function openCart() { $("cartDrawer").classList.add("open"); $("cartOverlay").hidden = false; }
function closeCart() { $("cartDrawer").classList.remove("open"); $("cartOverlay").hidden = true; }

/* ---------- Auth (email OTP) ---------- */
function openAuth(msg = "", kind = "") {
  $("authModal").hidden = false;
  setAuthMsg(msg, kind);
  if (state.email) { $("emailInput").value = state.email; }
}
function closeAuth() { $("authModal").hidden = true; resetAuthSteps(); }
function resetAuthSteps() {
  $("emailStep").hidden = false;
  $("otpStep").hidden = true;
  $("otpInput").value = "";
  setAuthMsg("");
}
function setAuthMsg(text, kind = "") {
  const el = $("authMsg");
  el.textContent = text;
  el.className = "auth-msg " + kind;
}

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendOtp() {
  const email = $("emailInput").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMsg("Enter a valid email address.", "error");
    return;
  }
  $("sendOtpBtn").disabled = true;
  setAuthMsg("Sending OTP...");
  try {
    const data = await api("/send-otp", { email });
    state.email = email;
    $("emailStep").hidden = true;
    $("otpStep").hidden = false;
    $("otpInput").focus();
    setAuthMsg(`OTP sent to ${email}. Check your inbox.`, "ok");
  } catch {
    setAuthMsg("Could not send OTP. Try again.", "error");
  } finally {
    $("sendOtpBtn").disabled = false;
  }
}

async function verifyOtp() {
  const otp = $("otpInput").value.trim();
  if (!/^\d{6}$/.test(otp)) {
    setAuthMsg("Enter the 6-digit OTP.", "error");
    return;
  }
  $("verifyOtpBtn").disabled = true;
  setAuthMsg("Verifying...");
  try {
    // Backend compares enteredOtp as a number, so send a number.
    const data = await api("/verify-otp", { email: state.email, enteredOtp: Number(otp) });
    if (data.token) {
      state.token = data.token;
      localStorage.setItem("estore_token", data.token);
      localStorage.setItem("estore_email", state.email);
      updateAccountUI();
      closeAuth();
      toast("Email verified ✓");
      if (state.pendingCheckout) {
        state.pendingCheckout = false;
        placeOrder();
      }
    } else {
      setAuthMsg(data.message || "Invalid OTP", "error");
    }
  } catch {
    setAuthMsg("Verification failed. Try again.", "error");
  } finally {
    $("verifyOtpBtn").disabled = false;
  }
}

function updateAccountUI() {
  const label = $("accountLabel");
  const btn = $("accountBtn");
  if (state.token && state.email) {
    label.textContent = "✓ " + state.email;
    btn.classList.add("verified");
  } else {
    label.textContent = "Sign in";
    btn.classList.remove("verified");
  }
}

function logout() {
  state.token = null;
  state.email = null;
  localStorage.removeItem("estore_token");
  localStorage.removeItem("estore_email");
  updateAccountUI();
  toast("Signed out");
}

/* ---------- Checkout ---------- */
function checkout() {
  if (!cartEntries().length) return;
  if (!state.token) {
    state.pendingCheckout = true;
    openAuth("Verify your email to place the order.", "ok");
    return;
  }
  placeOrder();
}

function placeOrder() {
  const orderId = "ORD" + Date.now().toString().slice(-8);
  $("orderId").textContent = orderId;
  $("orderEmail").textContent = state.email;
  $("orderModal").hidden = false;
  state.cart = {};
  saveCart();
  renderCart();
  closeCart();
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.add) addToCart(Number(t.dataset.add));
  if (t.dataset.inc) { state.cart[t.dataset.inc]++; saveCart(); renderCart(); }
  if (t.dataset.dec) {
    const id = t.dataset.dec;
    state.cart[id] = Math.max(0, (state.cart[id] || 0) - 1);
    if (!state.cart[id]) delete state.cart[id];
    saveCart(); renderCart();
  }
  if (t.dataset.remove) { delete state.cart[t.dataset.remove]; saveCart(); renderCart(); }
});

$("searchInput").addEventListener("input", (e) => renderProducts(e.target.value));
$("cartBtn").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
$("cartOverlay").addEventListener("click", closeCart);
$("checkoutBtn").addEventListener("click", checkout);

$("accountBtn").addEventListener("click", () => {
  if (state.token) {
    if (confirm(`Signed in as ${state.email}.\nSign out?`)) logout();
  } else {
    openAuth();
  }
});
$("closeAuth").addEventListener("click", closeAuth);
$("sendOtpBtn").addEventListener("click", sendOtp);
$("verifyOtpBtn").addEventListener("click", verifyOtp);
$("resendOtpBtn").addEventListener("click", () => {
  resetAuthSteps();
  setAuthMsg("Enter your email and send a new OTP.", "");
});
$("otpInput").addEventListener("keydown", (e) => { if (e.key === "Enter") verifyOtp(); });
$("emailInput").addEventListener("keydown", (e) => { if (e.key === "Enter") sendOtp(); });

$("closeOrder").addEventListener("click", () => { $("orderModal").hidden = true; });

/* ---------- Init ---------- */
renderProducts();
renderCart();
updateAccountUI();
