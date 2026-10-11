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
function getPagination(response) {
    return (
      response?.data?.pagination || response?.pagination || null
    );
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
  filters.sortBy = sortBy;
  filters.sortOrder = sortOrder;
}

const response = await api.products.list(filters);
const products = getProductList(response);
pagination = getPagination(response);
displayProducts(products);
updatePagination();
} catch (error) {
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
searchButton.addEventListener("click", searchProducts);


// Press Enter To Search
searchInput.addEventListener("keydown", function(event) {
  if(event.key === "Enter") {
    event.preventDefault();
    searchProducts();
  } 
});

// Previous Page
previousPageButton.addEventListener("click", function(){
  if(currentPage > 1){
    currentPage--;
    loadProducts();
  }
});

// Next Page
nextPageButton.addEventListener("click", function(){
  if(pagination && currentPage < Number(pagination.totalPages)) {
    currentPage++;
    loadProducts();
  }
});
// Sorting
sortSelect.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});
// Filtering
categoryFilter.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});

minPriceInput.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});

maxPriceInput.addEventListener("change", function() {
  currentPage = 1;
  loadProducts();
});


loadProducts();
