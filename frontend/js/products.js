/* products.js - product listing: search, filter, sort, pagination
 *
 * DATA SOURCE: all products come from the backend API. There is no sample data here.
 * To add a product, use the backend (POST /api/products or the admin product form).
 * It appears on this page automatically, along with its brand and category filters.
 *
 * Loads products once, then searches / filters / sorts / paginates in the browser.
 * State is kept in the URL (?q=&brand=&category=&min=&max=&stock=&sort=&page=&limit=)
 * so the page can be refreshed, bookmarked and shared.
 */
(function () {
  "use strict";

  /* =====================================================================
   * 1. CONFIG - the only values you should need to change
   * ===================================================================== */
  const API_BASE = window.API_BASE_URL || "http://localhost:5000";
  const PRODUCTS_ENDPOINT = API_BASE + "/api/products";
  const FETCH_LIMIT = 1000; // max products requested from the API in one call

  /* =====================================================================
   * 2. API CONTRACT - map backend fields to what this page needs.
   *    If the backend renames a field, change it here only.
   * ===================================================================== */

  /* Accepts [..], { products: [..] }, { data: [..] } or { data: { products: [..] } } */
  function extractList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.products)) return payload.products;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.products)) return payload.data.products;
    return [];
  }

  /* Expected product fields (only name and price are essential):
   *   _id | id, name, brand, category, description, price,
   *   stock | quantity | countInStock, images[] | image, createdAt */
  function normalize(p) {
    const image = Array.isArray(p.images) ? (p.images[0]?.url || p.images[0]) : (p.image || p.imageUrl || p.thumbnail || "");
    const stock = p.stock ?? p.quantity ?? p.countInStock ?? null;
    return {
      id: p._id || p.id,
      name: p.name || p.title || "Untitled product",
      brand: p.brand || "",
      category: p.category || "Uncategorized",
      description: p.description || "",
      price: Number(p.price) || 0,
      stock: stock === null ? null : Number(stock),
      image: image || "",
      createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
    };
  }

  /* =====================================================================
   * 3. BRAND TILE COLOURS (used only when a product has no image)
   *    Optional overrides: [background, text]. Any brand NOT listed here
   *    gets a colour automatically, so new brands need no code change.
   * ===================================================================== */
  const BRAND_COLORS = {
    "Milo": ["#2e7d32", "#fff"], "Nescafé": ["#b3261e", "#fff"], "Nido": ["#1565c0", "#fff"],
    "Golden Morn": ["#e65100", "#fff"], "Maggi": ["#f2b705", "#1d2320"], "Cerelac": ["#00897b", "#fff"],
    "Nutrend": ["#6a1b9a", "#fff"], "NAN": ["#0277bd", "#fff"], "SMA": ["#5e35b1", "#fff"],
    "Lactogen": ["#c75b00", "#fff"], "Chocomilo": ["#5d4037", "#fff"], "Nestlé Pure Life": ["#0097a7", "#fff"],
  };
  const FALLBACK_PALETTE = ["#0f5c4d", "#1565c0", "#b3261e", "#6a1b9a", "#e65100", "#00838f", "#5d4037", "#37474f", "#558b2f", "#ad1457"];

  function brandTile(brand) {
    const key = brand || "";
    if (BRAND_COLORS[key]) return `background:${BRAND_COLORS[key][0]};color:${BRAND_COLORS[key][1]}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return `background:${FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]};color:#fff`;
  }

  /* =====================================================================
   * 4. PAGE LOGIC - no need to edit below to add products
   * ===================================================================== */
  const DEFAULTS = { q: "", brands: [], categories: [], min: "", max: "", stock: false, sort: "newest", page: 1, limit: 12 };

  const $ = (id) => document.getElementById(id);
  const el = {
    search: $("searchInput"),
    sort: $("sortSelect"),
    pageSize: $("pageSizeSelect"),
    brandList: $("brandList"),
    categoryList: $("categoryList"),
    minPrice: $("minPrice"),
    maxPrice: $("maxPrice"),
    inStock: $("inStockOnly"),
    clear: $("clearFilters"),
    toggle: $("filtersToggle"),
    panel: $("filtersPanel"),
    chips: $("activeFilters"),
    grid: $("productGrid"),
    status: $("statusBox"),
    pagination: $("pagination"),
    summary: $("resultsSummary"),
  };

  let allProducts = [];
  let state = readStateFromUrl();

  /* ---------- Helpers ---------- */
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const formatPrice = (n) => money.format(Number(n) || 0);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  /* ---------- URL state ---------- */
  function readStateFromUrl() {
    const sp = new URLSearchParams(window.location.search);
    const num = (v, d) => (Number.isFinite(parseInt(v, 10)) && parseInt(v, 10) > 0 ? parseInt(v, 10) : d);
    return {
      q: sp.get("q") || DEFAULTS.q,
      brands: sp.getAll("brand"),
      categories: sp.getAll("category"),
      min: sp.get("min") || "",
      max: sp.get("max") || "",
      stock: sp.get("stock") === "1",
      sort: sp.get("sort") || DEFAULTS.sort,
      page: num(sp.get("page"), 1),
      limit: num(sp.get("limit"), DEFAULTS.limit),
    };
  }

  function writeStateToUrl() {
    const sp = new URLSearchParams();
    if (state.q) sp.set("q", state.q);
    state.brands.forEach((b) => sp.append("brand", b));
    state.categories.forEach((c) => sp.append("category", c));
    if (state.min !== "") sp.set("min", state.min);
    if (state.max !== "") sp.set("max", state.max);
    if (state.stock) sp.set("stock", "1");
    if (state.sort !== DEFAULTS.sort) sp.set("sort", state.sort);
    if (state.page > 1) sp.set("page", state.page);
    if (state.limit !== DEFAULTS.limit) sp.set("limit", state.limit);
    const qs = sp.toString();
    history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
  }

  function syncControlsFromState() {
    el.search.value = state.q;
    el.sort.value = state.sort;
    el.pageSize.value = String(state.limit);
    el.minPrice.value = state.min;
    el.maxPrice.value = state.max;
    el.inStock.checked = state.stock;
  }

  /* ---------- Data pipeline ---------- */
  function applyFilters(list) {
    const q = state.q.trim().toLowerCase();
    const min = state.min === "" ? null : Number(state.min);
    const max = state.max === "" ? null : Number(state.max);

    return list.filter((p) => {
      if (q && !(p.name + " " + p.brand + " " + p.description + " " + p.category).toLowerCase().includes(q)) return false;
      if (state.brands.length && !state.brands.includes(p.brand)) return false;
      if (state.categories.length && !state.categories.includes(p.category)) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (state.stock && !(p.stock === null || p.stock > 0)) return false;
      return true;
    });
  }

  function applySort(list) {
    const sorted = [...list];
    const by = {
      newest: (a, b) => b.createdAt - a.createdAt,
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
    };
    return sorted.sort(by[state.sort] || by.newest);
  }

  /* ---------- Rendering ---------- */
  function renderCheckList(container, field, selected, emptyText) {
    const counts = allProducts.reduce((m, p) => {
      if (p[field]) m[p[field]] = (m[p[field]] || 0) + 1;
      return m;
    }, {});
    const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    container.innerHTML = names.length
      ? names.map((name) => `
          <label class="check">
            <input type="checkbox" value="${escapeHtml(name)}" ${selected.includes(name) ? "checked" : ""} />
            <span>${escapeHtml(name)}</span>
            <span class="count">${counts[name]}</span>
          </label>`).join("")
      : `<p class="results-summary">${escapeHtml(emptyText)}</p>`;
  }

  function renderFilterLists() {
    renderCheckList(el.brandList, "brand", state.brands, "No brands yet.");
    renderCheckList(el.categoryList, "category", state.categories, "No categories yet.");
  }

  function stockBadge(p) {
    if (p.stock === null) return "";
    if (p.stock <= 0) return '<span class="badge out">Out of stock</span>';
    if (p.stock <= 10) return `<span class="badge">Only ${p.stock} left</span>`;
    return "";
  }

  function cardHtml(p) {
    const media = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />`
      : `<div class="placeholder" style="${brandTile(p.brand)}" aria-hidden="true">${escapeHtml(p.brand || p.name.charAt(0).toUpperCase())}</div>`;
    return `
      <a class="card" href="product-details.html?id=${encodeURIComponent(p.id)}">
        <div class="card-media">${media}${stockBadge(p)}</div>
        <div class="card-body">
          ${p.brand ? `<p class="card-brand">${escapeHtml(p.brand)}</p>` : ""}
          <h2 class="card-title">${escapeHtml(p.name)}</h2>
          <p class="card-cat">${escapeHtml(p.category)}</p>
          ${p.description ? `<p class="card-desc">${escapeHtml(p.description)}</p>` : ""}
          <p class="card-price">${formatPrice(p.price)}</p>
        </div>
      </a>`;
  }

  function renderSkeletons(count) {
    el.grid.setAttribute("aria-busy", "true");
    el.grid.innerHTML = Array.from({ length: count }, () => `
      <div class="card skeleton" aria-hidden="true">
        <div class="card-media"></div>
        <div class="card-body"><div class="line w60"></div><div class="line w90"></div><div class="line w60"></div></div>
      </div>`).join("");
  }

  function showStatus(title, message, actionLabel, actionFn) {
    el.status.hidden = false;
    el.status.innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>` +
      (actionLabel ? `<button type="button" class="btn" id="statusAction">${escapeHtml(actionLabel)}</button>` : "");
    if (actionLabel) $("statusAction").addEventListener("click", actionFn);
  }
  const hideStatus = () => { el.status.hidden = true; el.status.innerHTML = ""; };

  function hasActiveFilters() {
    return Boolean(state.q || state.brands.length || state.categories.length || state.min !== "" || state.max !== "" || state.stock);
  }

  function renderChips() {
    const chips = [];
    if (state.q) chips.push({ label: `Search: ${state.q}`, clear: () => (state.q = "") });
    state.brands.forEach((b) => chips.push({ label: b, clear: () => (state.brands = state.brands.filter((x) => x !== b)) }));
    state.categories.forEach((c) => chips.push({ label: c, clear: () => (state.categories = state.categories.filter((x) => x !== c)) }));
    if (state.min !== "") chips.push({ label: `Min ${formatPrice(state.min)}`, clear: () => (state.min = "") });
    if (state.max !== "") chips.push({ label: `Max ${formatPrice(state.max)}`, clear: () => (state.max = "") });
    if (state.stock) chips.push({ label: "In stock only", clear: () => (state.stock = false) });

    el.chips.innerHTML = "";
    chips.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = c.label;
      b.setAttribute("aria-label", `Remove filter: ${c.label}`);
      b.addEventListener("click", () => { c.clear(); state.page = 1; syncControlsFromState(); renderFilterLists(); update(); });
      el.chips.appendChild(b);
    });
  }

  function pageList(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
    if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => pages.add(n));
    const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("gap"); out.push(n); });
    return out;
  }

  function renderPagination(total) {
    const totalPages = Math.max(1, Math.ceil(total / state.limit));
    if (totalPages <= 1) { el.pagination.innerHTML = ""; return; }

    const btn = (label, page, opts = {}) =>
      `<button type="button" class="page-btn" data-page="${page}" ${opts.disabled ? "disabled" : ""} ${opts.current ? 'aria-current="page"' : ""} ${opts.aria ? `aria-label="${opts.aria}"` : ""}>${label}</button>`;

    el.pagination.innerHTML =
      btn("Previous", state.page - 1, { disabled: state.page === 1, aria: "Previous page" }) +
      pageList(state.page, totalPages).map((p) =>
        p === "gap" ? '<span class="page-gap" aria-hidden="true">…</span>'
                    : btn(p, p, { current: p === state.page, aria: `Page ${p}` })).join("") +
      btn("Next", state.page + 1, { disabled: state.page === totalPages, aria: "Next page" });
  }

  function update() {
    const filtered = applySort(applyFilters(allProducts));
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.limit));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.limit;
    const pageItems = filtered.slice(start, start + state.limit);

    renderChips();
    writeStateToUrl();
    el.grid.setAttribute("aria-busy", "false");

    if (!filtered.length) {
      el.grid.innerHTML = "";
      el.pagination.innerHTML = "";
      el.summary.textContent = "0 products found";
      hasActiveFilters()
        ? showStatus("No products match", "Try a different search term or remove some filters.", "Clear all filters", resetAll)
        : showStatus("No products yet", "Products added to the system will appear here.");
      return;
    }

    hideStatus();
    el.grid.innerHTML = pageItems.map(cardHtml).join("");
    renderPagination(filtered.length);
    el.summary.textContent = `Showing ${start + 1}-${start + pageItems.length} of ${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  }

  /* ---------- Actions ---------- */
  function resetAll() {
    state = { ...DEFAULTS, brands: [], categories: [], limit: state.limit };
    syncControlsFromState();
    renderFilterLists();
    update();
  }

  function goToPage(page) {
    state.page = page;
    update();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    el.search.addEventListener("input", debounce(() => { state.q = el.search.value; state.page = 1; update(); }, 250));
    el.sort.addEventListener("change", () => { state.sort = el.sort.value; state.page = 1; update(); });
    el.pageSize.addEventListener("change", () => { state.limit = parseInt(el.pageSize.value, 10); state.page = 1; update(); });

    el.brandList.addEventListener("change", () => {
      state.brands = [...el.brandList.querySelectorAll("input:checked")].map((i) => i.value);
      state.page = 1;
      update();
    });

    el.categoryList.addEventListener("change", () => {
      state.categories = [...el.categoryList.querySelectorAll("input:checked")].map((i) => i.value);
      state.page = 1;
      update();
    });

    const priceChange = debounce(() => {
      state.min = el.minPrice.value.trim();
      state.max = el.maxPrice.value.trim();
      state.page = 1;
      update();
    }, 350);
    el.minPrice.addEventListener("input", priceChange);
    el.maxPrice.addEventListener("input", priceChange);

    el.inStock.addEventListener("change", () => { state.stock = el.inStock.checked; state.page = 1; update(); });
    el.clear.addEventListener("click", resetAll);

    el.pagination.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-page]");
      if (b && !b.disabled) goToPage(parseInt(b.dataset.page, 10));
    });

    el.toggle.addEventListener("click", () => {
      const open = el.panel.classList.toggle("open");
      el.toggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- Load from the backend ---------- */
  async function loadProducts() {
    renderSkeletons(state.limit);
    hideStatus();
    try {
      const res = await fetch(PRODUCTS_ENDPOINT + "?limit=" + FETCH_LIMIT);
      if (!res.ok) throw new Error("Request failed with status " + res.status);
      allProducts = extractList(await res.json()).map(normalize);
    } catch (err) {
      console.error("Could not load products:", err);
      allProducts = [];
      el.grid.innerHTML = "";
      el.pagination.innerHTML = "";
      el.grid.setAttribute("aria-busy", "false");
      el.summary.textContent = "Products could not be loaded.";
      showStatus("Couldn't load products", "Check that the server is running and your connection is working, then try again.", "Try again", loadProducts);
      return;
    }
    renderFilterLists();
    update();
  }

  function init() {
    syncControlsFromState();
    bindEvents();
    loadProducts();
  }

  document.addEventListener("DOMContentLoaded", init);
})();