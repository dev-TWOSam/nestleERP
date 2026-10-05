import {api} from "./api.js"
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

const productImage = document.getElementById("productImage");
const productName = document.getElementById("productName");
const productCategory = document.getElementById("productCategory");
const productDescription = document.getElementById("productDescription");
const productSize = document.getElementById("productSize");
const productPrice = document.getElementById("productPrice");
const productQuantity = document.getElementById("productQuantity");
const productStatus = document.getElementById("productStatus");

async function localProduct() {
    try {
        const response = await api.products.getById(productId);
        const product = response.product;
        productImage.src = product.image;
        productImage.alt = product.name;
        productName.textContent = product.name;
        productCategory.textContent = `Category: ${product.category}`;
        productDescription.textContent = product.description;
        productSize.textContent = `Size: ${product.size}`;
        productPrice.textContent = `Price: ${product.price}`;
        productQuantity.textContent = `Quantity: ${product.quantity}`;
        productStatus.textContent = `Status: ${product.status}`;
    } catch (error) {
        console.error("Unable to load product:", error);
        productName.textContent = "Product Not Found";
        productCategory.textContent = "";
        productDescription.textContent = "Sorry, the product you are looking for does not exist.";
        productSize.textContent = "";
        productPrice.textContent = "";
        productQuantity.textContent = "";
        productStatus.textContent = "";
        productImage.removeAttribute("src");
        productImage.alt = "";

    }
}

localProduct();
