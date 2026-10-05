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

let products = [];
let currentPage = 1;
const pageLimit = 10;

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
  return response?.data?.pagination ?? response?.pagination ?? {};
}

function getProductQueryParams() {
  return {
    search: searchInput.value.trim(),
    category: categoryFilter.value,
    minPrice: minPriceInput.value,
    maxPrice: maxPriceInput.value,
    sortBy: sortBySelect.value,
    sortOrder: sortOrderSelect.value,
    page: currentPage,
    limit: pageLimit,
  };
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

function renderCategories() {
  const selectedCategory = categoryFilter.value;
  const categories = [
    ...new Set(products.map((product) => product.category).filter(Boolean)),
  ].sort();

  if (selectedCategory && !categories.includes(selectedCategory)) {
    categories.unshift(selectedCategory);
  }

  categoryFilter.innerHTML = `
    <option value="">All categories</option>
    ${categories
      .map(
        (category) =>
          `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
      )
      .join("")}
  `;

  categoryFilter.value = selectedCategory;
}

function renderProducts() {
  tableBody.innerHTML = "";
  emptyState.hidden = products.length !== 0;

  if (products.length === 0) {
    return;
  }

  products.forEach((product) => {
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

  if (totalItems === 0 || totalPages <= 1) {
    paginationContainer.hidden = true;
    return;
  }

  paginationContainer.hidden = false;
  paginationInfo.textContent = `Page ${page} of ${totalPages}`;
  previousPageButton.disabled = page <= 1;
  nextPageButton.disabled = page >= totalPages;
}

async function loadProducts() {
  const minPrice = Number(minPriceInput.value);
  const maxPrice = Number(maxPriceInput.value);

  if (
    minPriceInput.value !== "" &&
    maxPriceInput.value !== "" &&
    minPrice > maxPrice
  ) {
    showMessage("Minimum price cannot be greater than maximum price.");
    return;
  }

  hideMessage();
  setLoading(true);

  try {
    const response = await api.products.list(getProductQueryParams());

    products = getProductList(response);

    renderCategories();
    renderProducts();
    renderPagination(getPagination(response));
  } catch (error) {
    products = [];
    tableBody.innerHTML = "";
    emptyState.hidden = true;
    paginationContainer.hidden = true;

    showMessage(
      error instanceof ApiError ? error.message : "Unable to load products.",
    );
  } finally {
    setLoading(false);
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

searchInput.addEventListener("input", resetPageAndLoadProducts);
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

function initializePage() {
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
  loadProducts();
}

initializePage();
