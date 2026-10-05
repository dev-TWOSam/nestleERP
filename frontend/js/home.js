// import { api } from "./api.js";
import { api } from "./api.js";
let products = [];

const productContainer = document.getElementById("productContainer");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

// Display Featured Products
function displayFeaturedProducts(productList){
  productContainer.innerHTML = "";
  if(productList.length === 0){
    productContainer.innerHTML = "<p>No products available yet.</p>";
    return;
  }
  productList.forEach(function(product){
    const featuredProduct = document.createElement("div");
    featuredProduct.classList.add("featured-product");
    featuredProduct.innerHTML=`
    <a href="pages/product-details.html?id=${product._id}">
    <img src="${product.image}" alt="${product.name}">
    </a>
    `;
    productContainer.appendChild(featuredProduct);
  });
}

// Display Search Results Function
function displayProducts(productList) {
    productContainer.innerHTML = "";
    if(productList.length === 0){
      productContainer.innerHTML = "<p>No products found.</p>";
      return;
    }
    productList.forEach(function(product){
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");
          productCard.innerHTML =`
          <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <a href="pages/product-details.html?id=${product._id}">View Details</a>
            `;
    productContainer.appendChild(productCard);
    });
}

// Load Products
async function loadProducts() {
  try {
    const response = await api.products.list();
    products = response.products || [];
    displayFeaturedProducts(products.slice(0, 4));
  } catch (error) {
    console.error("Unable to load products", error);
    products = [];
    productContainer.innerHTML = "<p>No products available yet.</p>";
  }
}

// Search Products
searchButton.addEventListener("click", function() {
const searchTerm = searchInput.value.toLowerCase().trim();
if (products.length === 0) {
  productContainer.innerHTML = "<p>No products found.</p>";
  return;
}
const filteredProducts = products.filter(function(product){
return(
product.name.toLowerCase().includes(searchTerm) ||
product.category.toLowerCase().includes(searchTerm)
);
});
 displayProducts(filteredProducts);
});
loadProducts();
