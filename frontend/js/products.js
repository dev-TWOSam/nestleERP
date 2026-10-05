/* products.js - product listing: search, filter, sort, pagination
 *
 * DATA SOURCE: everything comes from the backend through js/api.js
 *   api.products.list(filters)   -> products + pagination
 *   api.products.categories()    -> category dropdown
 * Search, category, price, sorting and pagination are done by the SERVER.
 * Only "In stock only" is applied in the browser, on the current page.
 *
 * State is kept in the URL (?q=&category=&min=&max=&stock=&sort=&page=&limit=)
 * so the page can be refreshed, bookmarked and shared.
 */
import { api } from "./api.js";

(function () {
  "use strict";

  /* =====================================================================
   * 1. API CONTRACT - map backend fields to what this page needs.
   *    If the backend renames a field, change it in normalize() only.
   * ===================================================================== */

  /* Backend product model: name, description, category, price, size,
   * quantity, status, color, image (plus _id / createdAt). */
  function normalize(p) {
    const image = Array.isArray(p.images) ? (p.images[0]?.url || p.images[0]) : (p.image?.url || p.image || p.imageUrl || p.thumbnail || "");
    const stock = p.stock ?? p.quantity ?? p.countInStock ?? null;
    return {
      id: p._id || p.id,
      name: p.name || p.title || "Untitled product",
      category: p.category || "Uncategorized",
      description: p.description || "",
      price: Number(p.price) || 0,
      stock: stock === null ? null : Number(stock),
      image: image || "",
      createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
    };
  }

  /* Tile colour for products without an image (based on category) */
  const TILE_PALETTE = ["#0f5c4d", "#1565c0", "#b3261e", "#6a1b9a", "#e65100", "#00838f", "#5d4037", "#37474f", "#558b2f", "#ad1457"];
  function categoryTile(category) {
    const key = category || "";
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return `background:${TILE_PALETTE[hash % TILE_PALETTE.length]};color:#fff`;
  }

  /* =====================================================================
   * 2. STATE + DOM
   * ===================================================================== */
  const DEFAULTS = {
    q: "",
    category: "",
    min: "",
    max: "",
    stock: false,
    sort: "newest",
    page: 1,
    limit: 12,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    search: $("searchInput"),
    sort: $("sortSelect"),
    pageSize: $("pageSizeSelect"),
    categorySelect: $("categorySelect"),
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
  let paginationData = {
    page: 1,
    limit: 12,
    totalItems: 0,
    totalPages: 1,
  };
  let state = readStateFromUrl();
  let requestId = 0; // ignores out-of-date responses when the user types or clicks quickly

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
      category: sp.get("category") || "",
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
    if (state.category) sp.set("category", state.category);
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
    el.categorySelect.value = state.category;
    el.minPrice.value = state.min;
    el.maxPrice.value = state.max;
    el.inStock.checked = state.stock;
  }

  /* =====================================================================
   * 3. REQUEST BUILDING + FILTERING
   * ===================================================================== */
  function getSortParams() {
    const sortMap = {
      newest: { sortBy: "createdAt", sortOrder: "desc" },
      "name-asc": { sortBy: "name", sortOrder: "asc" },
      "name-desc": { sortBy: "name", sortOrder: "desc" },
      "price-asc": { sortBy: "price", sortOrder: "asc" },
      "price-desc": { sortBy: "price", sortOrder: "desc" },
    };
    return sortMap[state.sort] || sortMap.newest;
  }

  /* Filters sent to api.products.list(). Empty values are left out. */
  function buildFilters() {
    const { sortBy, sortOrder } = getSortParams();
    const filters = { sortBy, sortOrder, page: state.page, limit: state.limit };
    const q = state.q.trim();
    if (q) filters.search = q;
    if (state.category) filters.category = state.category;
    if (state.min !== "") filters.minPrice = state.min;
    if (state.max !== "") filters.maxPrice = state.max;
    return filters;
  }

  /* Applied to the products of the current page (the server has already
   * filtered by search, category and price; this mainly handles "In stock only"). */
  function applyFilters(list) {
    const q = state.q.trim().toLowerCase();
    const min = state.min === "" ? null : Number(state.min);
    const max = state.max === "" ? null : Number(state.max);

    return list.filter((p) => {
      const searchableText = [p.id, p.name, p.description, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Search by product ID, name, description or category
      if (q && !searchableText.includes(q)) return false;
      if (state.category && p.category !== state.category) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (state.stock && !(p.stock === null || p.stock > 0)) return false;
      return true;
    });
  }

  function readPagination(response, productCount) {
    const raw = response?.data?.pagination || response?.pagination || {};
    const limit = Number(raw.limit) || state.limit;
    const totalItems = Number(raw.totalItems ?? raw.total ?? productCount) || 0;
    return {
      page: Number(raw.page) || state.page,
      limit,
      totalItems,
      totalPages: Number(raw.totalPages) || Math.max(1, Math.ceil(totalItems / limit)),
    };
  }

  /* =====================================================================
   * 4. RENDERING
   * ===================================================================== */
  function stockBadge(p) {
    if (p.stock === null) return "";
    if (p.stock <= 0) return '<span class="badge out">Out of stock</span>';
    if (p.stock <= 10) return `<span class="badge">Only ${p.stock} left</span>`;
    return "";
  }

  function cardHtml(p) {
    const media = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />`
      : `<div class="placeholder" style="${categoryTile(p.category)}" aria-hidden="true">${escapeHtml(p.category)}</div>`;
    return `
      <a class="card" href="product-details.html?id=${encodeURIComponent(p.id)}">
        <div class="card-media">${media}${stockBadge(p)}</div>
        <div class="card-body">
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
    return Boolean(state.q || state.category || state.min !== "" || state.max !== "" || state.stock);
  }

  function renderChips() {
    const chips = [];
    if (state.q) chips.push({ label: `Search: ${state.q}`, clear: () => (state.q = "") });
    if (state.category) chips.push({ label: state.category, clear: () => (state.category = "") });
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
      b.addEventListener("click", () => { c.clear(); state.page = 1; syncControlsFromState(); loadProducts(); });
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

  async function goToPage(page) {
    state.page = page;
    await loadProducts();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function renderPagination() {
    const currentPage = paginationData.page;
    const totalPages = paginationData.totalPages;

    el.pagination.innerHTML = "";
    if (totalPages <= 1) return;

    const createButton = (label, page, disabled = false, ariaLabel = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-btn";
      button.textContent = label;
      button.disabled = disabled;
      if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
      button.addEventListener("click", () => goToPage(page));
      return button;
    };

    el.pagination.appendChild(createButton("Previous", currentPage - 1, currentPage <= 1, "Previous page"));

    pageList(currentPage, totalPages).forEach((page) => {
      if (page === "gap") {
        const gap = document.createElement("span");
        gap.className = "page-gap";
        gap.setAttribute("aria-hidden", "true");
        gap.textContent = "…";
        el.pagination.appendChild(gap);
        return;
      }
      const button = createButton(String(page), page, false, `Page ${page}`);
      if (page === currentPage) {
        button.classList.add("active");
        button.setAttribute("aria-current", "page");
      }
      el.pagination.appendChild(button);
    });

    el.pagination.appendChild(createButton("Next", currentPage + 1, currentPage >= totalPages, "Next page"));
  }

  /* Renders whatever loadProducts() fetched */
  function update() {
    renderChips();
    writeStateToUrl();
    el.grid.setAttribute("aria-busy", "false");

    if (!allProducts.length) {
      el.grid.innerHTML = "";
      el.pagination.innerHTML = "";
      el.summary.textContent = "0 products found";
      hasActiveFilters()
        ? showStatus("No products match", "Try a different search term or remove some filters.", "Clear all filters", resetAll)
        : showStatus("No products yet", "Products added to the system will appear here.");
      return;
    }

    hideStatus();
    el.grid.innerHTML = allProducts.map(cardHtml).join("");
    renderPagination();

    const start = (paginationData.page - 1) * paginationData.limit + 1;
    const end = start + allProducts.length - 1;
    el.summary.textContent = `Showing ${start}-${end} of ${paginationData.totalItems} products`;
  }

  /* =====================================================================
   * 5. ACTIONS + EVENTS
   * ===================================================================== */
  function resetAll() {
    state = { ...DEFAULTS, limit: state.limit };
    syncControlsFromState();
    loadProducts();
  }

  function bindEvents() {
    el.search.addEventListener("input", debounce(() => { state.q = el.search.value; state.page = 1; loadProducts(); }, 300));
    el.sort.addEventListener("change", () => { state.sort = el.sort.value; state.page = 1; loadProducts(); });