import {api} from "./api.js";
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
const productImage = document.getElementById("productImage");
const productName = document.getElementById("productName");
const productCategory = document.getElementById("productCategory");
const productDescription = document.getElementById("productDescription");
const productSize = document.getElementById("productSize");
const productPrice = document.getElementById("productPrice");
const productQuantity = document.getElementById("productQuantity");
const productColor = document.getElementById("productColor");
const productStatus = document.getElementById("productStatus");

async function loadProduct() {
    if (!productId) {
        productName.textContent = "Product Not Found";
        productDescription.textContent = "No product ID was provided.";
        productImage.removeAttribute("src");
        return;
    }
    try {
          const response = await api.products.getById(productId);
          const product = response?.data?.product ?? response?.product;
          if (!product) {
            throw new Error("Product not found");
        }
        
        productImage.src = product.image || "";
        productImage.alt = product.name || "Product image";
        productName.textContent = product.name || "";
        productCategory.textContent = `Category: ${product.category || ""}`;
        productDescription.textContent = product.description || "";
        productSize.textContent = `Size: ${product.size || ""}`;
        productPrice.textContent = `Price: ₦${product.price ?? ""}`;
        productQuantity.textContent = `Quantity: ${product.quantity ?? ""}`;
        productColor.textContent = `Color: ${product.color || ""}`;
        productStatus.textContent = `Status: ${product.status || ""}`;
    } catch (error) {
        console.error("Unable to load product:", error);
        productName.textContent = "Product Not Found";
        productCategory.textContent = "";
        productDescription.textContent = "Sorry, the product you are looking for does not exist.";
        productSize.textContent = "";
        productPrice.textContent = "";
        productQuantity.textContent = "";
        productColor.textContent = "";
        productStatus.textContent = "";
        productImage.removeAttribute("src");
        productImage.alt = "";

    }
}

loadProduct();
