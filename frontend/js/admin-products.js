import { api, ApiError, hasRole, isAuthenticated } from "./api.js";

const tableBody = document.querySelector("#products-table-body");
const loadingState = document.querySelector("#products-loading");
const emptyState = document.querySelector("#products-empty");
const pageMessage = document.querySelector("#page-message");
const searchInput = document.querySelector("#product-search");
const categoryFilter = document.querySelector("#category-filter");
const minPriceInput = document.querySelector("#min-price");
const maxPriceInput = document.querySelector("#max-price");
const sortBySelect = document.querySelector("#sort-by");
const sortOrderSelect = document.querySelector("#sort-order");
const refreshButton = document.querySelector("#refresh-products");
const addProductButton = document.querySelector("#add-product-button");
const paginationContainer = document.querySelector("#pagination");
const previousPageButton = document.querySelector("#previous-page");
const nextPageButton = document.querySelector("#next-page");
const paginationInfo = document.querySelector("#pagination-info");
const pageNumberButtons = document.querySelector("#page-number-buttons");

let products = [];
let currentPage = 1;
let latestProductRequestId = 0;
let searchDebounceTimer = null;
const pageLimit = 12;

const canManageProducts = () => hasRole("inventory-manager", "super-admin");

function showMessage(message, type = "error") {
  pageMessage.textContent = message;
  pageMessage.dataset.type = type;
  pageMessage.hidden = false;
}

function hideMessage() {
  pageMessage.hidden = true;
  pageMessage.textContent = "";
}

function setLoading(isLoading) {
  loadingState.hidden = !isLoading;
  refreshButton.disabled = isLoading;
}

function getProductList(response) {
  if (Array.isArray(response?.data?.products)) {
    return response.data.products;
  }

  return Array.isArray(response?.products) ? response.products : [];
}

function getPagination(response) {
  const supplied = response?.data?.pagination ?? response?.pagination ?? {};
  const rawTotalItems = Number(
    supplied.totalItems ?? supplied.total ??
    response?.data?.totalItems ?? response?.totalItems ?? response?.count ?? 0,
  );
  const totalItems = Number.isFinite(rawTotalItems) && rawTotalItems >= 0 ? rawTotalItems : 0;
  const limit = Number(supplied.limit ?? response?.data?.limit ?? response?.limit) || pageLimit;
  const page = Number(supplied.page ?? response?.data?.page ?? response?.page) || currentPage;
  const suppliedTotalPages = Number(supplied.totalPages ?? response?.data?.totalPages ?? response?.totalPages);
  const totalPages = Number.isFinite(suppliedTotalPages) && suppliedTotalPages > 0
    ? suppliedTotalPages
    : Math.max(1, Math.ceil(totalItems / limit));
  return { ...supplied, page, limit, totalItems, totalPages };
}

function getProductQueryParams() {
  const sortBy = sortBySelect.value;
  const params = {
    search: searchInput.value.trim(),
    category: categoryFilter.value,
    minPrice: minPriceInput.value,
    maxPrice: maxPriceInput.value,
    page: currentPage,
    limit: pageLimit,
  };

  // The API supports name, price, and creation-date sorting. Category sorting
  // is applied to the current page below instead of sending an unsupported sort.
  if (sortBy && sortBy !== "category") {
    params.sortBy = sortBy;
    params.sortOrder = sortOrderSelect.value;
  }

  return params;
}

function formatPrice(price) {
  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return "N/A";
  }

  return `₦${amount.toLocaleString("en-NG")}`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

async function loadCategories() {
  const selectedCategory = categoryFilter.value;

  try {
    const response = await api.products.categories();

    const categories =
      response?.data?.categories ??
      response?.categories ??
      response?.data ??
      response;

    const uniqueCategories = [];

    if (Array.isArray(categories)) {
      const seen = new Set();

      categories.forEach((category) => {
        const value = String(category ?? "").trim();

        if (!value) {
          return;
        }

        const key = value.toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          uniqueCategories.push(value);
        }
      });
    }

    uniqueCategories.sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      }),
    );

    categoryFilter.innerHTML = `
      <option value="">All categories</option>
      ${uniqueCategories
        .map(
          (category) =>
            `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
        )
        .join("")}
    `;

    /*
     * Preserve the currently selected category.
     * This also handles a category that may no longer
     * be returned by the backend.
     */
    if (
      selectedCategory &&
      !uniqueCategories.some(
        (category) =>
          category.toLowerCase() === selectedCategory.toLowerCase(),
      )
    ) {
      const option = document.createElement("option");

      option.value = selectedCategory;
      option.textContent = selectedCategory;

      categoryFilter.appendChild(option);
    }

    categoryFilter.value = selectedCategory;
  } catch (error) {
    console.error("Unable to load product categories:", error);

    /*
     * If the categories endpoint fails, retain the
     * currently selected category instead of breaking
     * the admin products page.
     */
    categoryFilter.innerHTML = `
      <option value="">All categories</option>
    `;

    if (selectedCategory) {
      const option = document.createElement("option");

      option.value = selectedCategory;
      option.textContent = selectedCategory;

      categoryFilter.appendChild(option);
      categoryFilter.value = selectedCategory;
    }
  }
}

function renderProducts() {
  tableBody.innerHTML = "";
  emptyState.hidden = products.length !== 0;

  if (products.length === 0) {
    return;
  }

  const visibleProducts = [...products];
  if (sortBySelect.value === "category") {
    const direction = sortOrderSelect.value === "desc" ? -1 : 1;
    visibleProducts.sort((a, b) =>
      String(a.category || "").localeCompare(String(b.category || ""), undefined, { sensitivity: "base" }) * direction,
    );
  }

  visibleProducts.forEach((product) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="admin-products__product">
          <img
            class="admin-products__image"
            src="${escapeHtml(product.image)}"
            alt="${escapeHtml(product.name)}"
          />

          <div>
            <p class="admin-products__product-name">
              ${escapeHtml(product.name)}
            </p>

            <p class="admin-products__product-description">
              ${escapeHtml(product.description)}
            </p>
          </div>
        </div>
      </td>

      <td>${escapeHtml(product.category)}</td>

      <td>${formatPrice(product.price)}</td>

      <td>${escapeHtml(product.size)}</td>

      <td>${escapeHtml(product.quantity)}</td>

      <td>
        <span class="admin-products__status">
          ${escapeHtml(product.status)}
        </span>
      </td>

      <td>
        <div class="admin-products__actions">
          ${
            canManageProducts()
              ? `
                <a
                  class="admin-products__action"
                  href="./product-form.html?id=${encodeURIComponent(product._id)}"
                >
                  Edit
                </a>

                <button
                  class="admin-products__action admin-products__action--danger"
                  type="button"
                  data-delete-id="${escapeHtml(product._id)}"
                >
                  Delete
                </button>
              `
              : `
                <a
                  class="admin-products__action"
                  href="./product-details.html?id=${encodeURIComponent(product._id)}"
                >
                  View
                </a>
              `
          }
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function renderPagination(pagination = {}) {
  const page = Number(pagination.page) || currentPage;
  const totalPages = Number(pagination.totalPages) || 1;
  const totalItems = Number(pagination.totalItems) || 0;

  currentPage = page;

  if (!paginationContainer || !previousPageButton || !nextPageButton || !paginationInfo) return;
  if (totalPages <= 1) {
    paginationContainer.hidden = true;
    if (pageNumberButtons) pageNumberButtons.replaceChildren();
    return;
  }

  paginationContainer.hidden = false;
  paginationInfo.textContent = `Page ${page} of ${totalPages} · ${totalItems.toLocaleString()} products`;
  previousPageButton.disabled = page <= 1;
  nextPageButton.disabled = page >= totalPages;

  if (pageNumberButtons) {
    pageNumberButtons.replaceChildren();
    const maxVisible = 7;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let number = start; number <= end; number += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--secondary pagination__page";
      button.textContent = String(number);
      button.setAttribute("aria-label", `Page ${number}`);
      if (number === page) {
        button.classList.add("is-active");
        button.setAttribute("aria-current", "page");
        button.disabled = true;
      }
      button.addEventListener("click", () => {
        if (number !== currentPage) {
          currentPage = number;
          loadProducts();
        }
      });
      pageNumberButtons.appendChild(button);
    }
  }
}

async function loadProducts() {
  const requestId = ++latestProductRequestId;
  const minPrice = Number(minPriceInput.value);
  const maxPrice = Number(maxPriceInput.value);

  if (
    minPriceInput.value !== "" &&
    maxPriceInput.value !== "" &&
    minPrice > maxPrice
  ) {
    showMessage("Minimum price cannot be greater than maximum price.");
    setLoading(false);
    return;
  }

  hideMessage();
  setLoading(true);

  try {
    const response = await api.products.list(getProductQueryParams());
    if (requestId !== latestProductRequestId) return;

    products = getProductList(response);
    const pagination = getPagination(response);

    const suppliedPagination = response?.data?.pagination ?? response?.pagination ?? {};
    const hasTotalMetadata = [
      suppliedPagination.totalItems,
      suppliedPagination.total,
      response?.data?.totalItems,
      response?.totalItems,
      response?.count,
    ].some((value) => value !== undefined && value !== null && value !== "");

    if (!hasTotalMetadata) {
      try {
        const countResponse = await api.products.list({
          ...getProductQueryParams(),
          page: 1,
          limit: 1000,
        });
        if (requestId !== latestProductRequestId) return;
        const countProducts = getProductList(countResponse);
        pagination.totalItems = countProducts.length;
        pagination.totalPages = Math.max(1, Math.ceil(countProducts.length / pageLimit));
      } catch {
        // Preserve the product table even if the optional count request fails.
      }
    }

    currentPage = Math.min(pagination.page, pagination.totalPages);
    renderProducts();
    renderPagination({ ...pagination, page: currentPage });
  } catch (error) {
    if (requestId !== latestProductRequestId) return;
    products = [];
    tableBody.innerHTML = "";
    emptyState.hidden = true;
    paginationContainer.hidden = true;

    showMessage(
      error instanceof ApiError ? error.message : "Unable to load products.",
    );
  } finally {
    if (requestId === latestProductRequestId) setLoading(false);
  }
}

async function deleteProduct(productId) {
  const product = products.find((item) => item._id === productId);

  if (!product) {
    return;
  }

  const confirmed = window.confirm(
    `Delete "${product.name}"? This action cannot be undone.`,
  );

  if (!confirmed) {
    return;
  }

  try {
    await api.products.remove(productId);

    showMessage("Product deleted successfully.", "success");

    if (products.length === 1 && currentPage > 1) currentPage -= 1;
    await loadProducts();
  } catch (error) {
    showMessage(
      error instanceof ApiError ? error.message : "Unable to delete product.",
    );
  }
}

function resetPageAndLoadProducts() {
  currentPage = 1;
  loadProducts();
}

tableBody.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-id]");

  if (!deleteButton) {
    return;
  }

  deleteProduct(deleteButton.dataset.deleteId);
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(resetPageAndLoadProducts, 250);
});
categoryFilter.addEventListener("change", resetPageAndLoadProducts);
minPriceInput.addEventListener("change", resetPageAndLoadProducts);
maxPriceInput.addEventListener("change", resetPageAndLoadProducts);
sortBySelect.addEventListener("change", resetPageAndLoadProducts);
sortOrderSelect.addEventListener("change", resetPageAndLoadProducts);
refreshButton.addEventListener("click", loadProducts);

previousPageButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadProducts();
  }
});

nextPageButton.addEventListener("click", () => {
  if (!nextPageButton.disabled) {
    currentPage += 1;
    loadProducts();
  }
});

async function initializePage() {
  if (!isAuthenticated()) {
    window.location.href = "./admin-login.html";
    return;
  }

  if (!canManageProducts()) {
    showMessage("You do not have permission to access product management.");
    setLoading(false);
    return;
  }

  addProductButton.hidden = false;

await loadCategories();
await loadProducts();
}

initializePage();
