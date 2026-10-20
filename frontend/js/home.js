import { api } from "./api.js";

const productContainer = document.getElementById("productContainer");
const productsHeading  = document.getElementById("productsHeading");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const previousPageButton = document.getElementById("previousPage");
const nextPageButton = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const sortSelect = document.getElementById("sortSelect");
const categoryFilter = document.getElementById("categoryFilter");
const minPriceInput = document.getElementById("minPrice");
const maxPriceInput = document.getElementById("maxPrice");

// Paginatio State
let currentPage = 1;
const limit = 12;
let pagination = null;
let currentSearch = "";

// Get Product List
function getProductList(response) {
    return ( 
      response?.data?.products || response?.products || []
    );
}

// Pagination Data
function getPagination(response, productCount = 0) {
    const raw = response?.data?.pagination || response?.pagination || {};
    const page = Number(raw.page ?? response?.data?.page ?? response?.page ?? currentPage) || currentPage;
    const pageLimit = Number(raw.limit ?? response?.data?.limit ?? response?.limit ?? limit) || limit;
    const totalItems = Number(
      raw.totalItems ?? raw.total ?? response?.data?.totalItems ?? response?.totalItems ?? response?.count ?? productCount
    );
    const explicitTotalPages = Number(raw.totalPages ?? response?.data?.totalPages ?? response?.totalPages);
    return {
      page,
      limit: pageLimit,
      totalItems: Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : productCount,
      totalPages: Number.isFinite(explicitTotalPages) && explicitTotalPages > 0
        ? explicitTotalPages
        : Math.max(1, Math.ceil((Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : productCount) / pageLimit)),
    };
}

// Display Products
function displayProducts(productList) {
  productContainer.innerHTML = "";
  if (!productList.length) {
    productContainer.innerHTML = "<p>No products found.</p>";
    return;
    }
  productList.forEach(function(product) {
    const productCard = document.createElement("div");
    productCard.classList.add("product-card");
    productCard.innerHTML = `
      <img src="${product.image || ""}" alt="${product.name || "Product"}">
      <h3 class="product-card__name" title="${product.name || "Unnamed Product"}">${product.name || "Unnamed Product"}</h3>
      <p class="product-card__description" title="${product.description || ""}">${product.description || "No description available."}</p>
      <p class="product-card__price" title="Price: ₦${product.price ?? "N/A"}">Price: ₦${product.price ?? "N/A"}</p>
      <div class="product-card__actions">
        <a href="pages/product-details.html?id=${encodeURIComponent(product._id || "")}">View Details</a>
      </div>
    `;
    productContainer.appendChild(productCard);
  });
}

// Update Pagination
function updatePagination() {
  if (!pagination) {
    if(pageInfo) {
      pageInfo.textContent = "";
    }
    if(previousPageButton) {
      previousPageButton.disabled = true;
    }
    if(nextPageButton) {
      nextPageButton.disabled = true;
    }
        return;
    }

    const page = pagination.page || currentPage;
    const totalPages = pagination.totalPages || 1;

    if(pageInfo) {
      pageInfo.textContent = `Page ${page} of ${totalPages}`;
    }

    if(previousPageButton) {
      previousPageButton.disabled = page <= 1;
    }

    if(nextPageButton) {
      nextPageButton.disabled = page >= totalPages;
    }
}

// Populate the category filter from all categories in the database.
async function loadCategories() {
  try {
    const response = await api.products.categories();
    const categories = response?.data?.categories || response?.categories || [];
    const selected = categoryFilter?.value || "";
    if (!categoryFilter || !Array.isArray(categories)) return;
    categoryFilter.innerHTML = '<option value="">All categories</option>';
    [...new Set(categories.map((item) => String(item || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });
    categoryFilter.value = selected;
  } catch (error) {
    console.error("Unable to load product categories:", error);
  }
}

// Load Products
async function loadProducts() {
  try {
    productContainer.innerHTML = "<p>Loading products...</p>";
    const filters = {
      page: currentPage, limit: limit
    };
    
if (currentSearch) {
  filters.search = currentSearch;
}

if (categoryFilter?.value.trim()) {
  filters.category = categoryFilter.value.trim();
}

if (minPriceInput?.value) {
  filters.minPrice = minPriceInput.value;
}

if (maxPriceInput?.value) {
  filters.maxPrice = maxPriceInput.value;
}

// Sorting
const sortValue = sortSelect?.value || "";

if (sortValue) {
  const [sortBy, sortOrder] = sortValue.split("-");
  filters.sort = `${sortBy}_${sortOrder}`;
}

const response = currentSearch
  ? await api.products.search(filters)
  : await api.products.list(filters);
const products = getProductList(response);

// Some API responses contain only the current page and omit totalItems/totalPages.
// In that case, request the filtered result set with a larger limit so the
// Previous/Next controls can determine whether additional pages exist.
const rawPagination = response?.data?.pagination || response?.pagination || {};
const hasTotalMetadata = [
  rawPagination.totalItems,
  rawPagination.total,
  rawPagination.totalPages,
  response?.data?.totalItems,
  response?.totalItems,
  response?.count,
].some((value) => value !== undefined && value !== null && value !== "");

pagination = getPagination(response, products.length);
if (!hasTotalMetadata) {
  try {
    const countFilters = { ...filters, page: 1, limit: 1000 };
    const countResponse = currentSearch
      ? await api.products.search(countFilters)
      : await api.products.list(countFilters);
    const allMatchingProducts = getProductList(countResponse);
    pagination.totalItems = allMatchingProducts.length;
    pagination.totalPages = Math.max(1, Math.ceil(allMatchingProducts.length / limit));
  } catch (countError) {
    console.warn("Could not calculate the full product count; using API pagination data.", countError);
  }
}

// Keep the requested page in sync with the pagination data returned by the API.
pagination.page = currentPage;
displayProducts(products);
updatePagination();
} catch (error) {
  // The search endpoint returns HTTP 404 when there are no matching products.
  if (currentSearch && error?.status === 404) {
    displayProducts([]);
    pagination = null;
    updatePagination();
    return;
  }
  console.error("Unable to load products:", error);
  productContainer.innerHTML = "<p>Unable to load products. Please try again.</p>"
  pagination = null;
  updatePagination();
}
}

// Search Products
async function searchProducts() {
  currentSearch = searchInput.value.trim();
  currentPage = 1;
  if (currentSearch){
    productsHeading.textContent = "Search Results";
  }else{
    productsHeading.textContent = "Featured Products";
  }
  await loadProducts();
}

// Search Button
searchButton?.addEventListener("click", searchProducts);


// Press Enter To Search
searchInput?.addEventListener("keydown", function(event) {
  if(event.key === "Enter") {
    event.preventDefault();
    searchProducts();
  } 
});

// Previous Page
previousPageButton?.addEventListener("click", function(){
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
});

// Next Page
nextPageButton?.addEventListener("click", function(){
  const totalPages = Number(pagination?.totalPages || 1);
  if (currentPage < totalPages) {
    currentPage++;
    loadProducts();
  }
});
// Sorting
sortSelect?.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});
// Filtering
categoryFilter?.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});

minPriceInput?.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});

maxPriceInput?.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});


loadCategories();
loadProducts();
