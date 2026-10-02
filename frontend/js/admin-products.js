import {
  api,
  ApiError,
  hasRole,
  isAuthenticated,
} from "./api.js";

const tableBody = document.querySelector("#products-table-body");
const loadingState = document.querySelector("#products-loading");
const emptyState = document.querySelector("#products-empty");
const pageMessage = document.querySelector("#page-message");
const searchInput = document.querySelector("#product-search");
const categoryFilter = document.querySelector("#category-filter");
const refreshButton = document.querySelector("#refresh-products");
const addProductButton = document.querySelector("#add-product-button");

let products = [];

const canManageProducts = () =>
  hasRole("inventory-manager", "super-admin");

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
  return Array.isArray(response?.products)
    ? response.products
    : [];
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
  const categories = [
    ...new Set(
      products
        .map((product) => product.category)
        .filter(Boolean),
    ),
  ].sort();

  categoryFilter.innerHTML = `
    <option value="">All categories</option>
    ${categories
      .map(
        (category) =>
          `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
      )
      .join("")}
  `;
}

function getFilteredProducts() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  return products.filter((product) => {
    const matchesSearch =
      !search ||
      product.name?.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search);

    const matchesCategory =
      !category || product.category === category;

    return matchesSearch && matchesCategory;
  });
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();

  tableBody.innerHTML = "";

  emptyState.hidden = filteredProducts.length !== 0;

  if (filteredProducts.length === 0) {
    return;
  }

  filteredProducts.forEach((product) => {
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

async function loadProducts() {
  hideMessage();
  setLoading(true);

  try {
    const response = await api.products.list();

    products = getProductList(response);

    renderCategories();
    renderProducts();
  } catch (error) {
    products = [];
    tableBody.innerHTML = "";
    emptyState.hidden = true;

    showMessage(
      error instanceof ApiError
        ? error.message
        : "Unable to load products.",
    );
  } finally {
    setLoading(false);
  }
}

async function deleteProduct(productId) {
  const product = products.find(
    (item) => item._id === productId,
  );

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
      error instanceof ApiError
        ? error.message
        : "Unable to delete product.",
    );
  }
}

tableBody.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(
    "[data-delete-id]",
  );

  if (!deleteButton) {
    return;
  }

  deleteProduct(deleteButton.dataset.deleteId);
});

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
refreshButton.addEventListener("click", loadProducts);

if (canManageProducts()) {
  addProductButton.hidden = false;
}

if (!isAuthenticated()) {
  showMessage("Please log in to access product management.");
  setLoading(false);
} else {
  loadProducts();
}