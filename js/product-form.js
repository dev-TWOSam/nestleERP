import {
  api,
  ApiError,
  getCurrentUser,
  isAuthenticated,
  hasRole,
} from "./api.js";

const form = document.querySelector("#product-form");
const formTitle = document.querySelector("#form-title");
const formDescription = document.querySelector("#form-description");
const pageMessage = document.querySelector("#page-message");
const submitButton = document.querySelector("#submit-button");
const imageInput = document.querySelector("#image");
const imagePreview = document.querySelector("#image-preview");
const previewImage = document.querySelector("#preview-image");
const imageHelp = document.querySelector("#image-help");

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const isEditMode = Boolean(productId);

function showMessage(message, type = "error") {
  pageMessage.textContent = message;
  pageMessage.dataset.type = type;
  pageMessage.hidden = false;
}

function hideMessage() {
  pageMessage.hidden = true;
  pageMessage.textContent = "";
}

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "Saving..." : "Save Product";
}

function disableForm() {
  form
    .querySelectorAll("input, select, textarea, button")
    .forEach((element) => {
      element.disabled = true;
    });
}

function setValue(name, value) {
  const field = form.elements[name];

  if (field) {
    field.value = value ?? "";
  }
}

function getFormValue(name) {
  return form.elements[name].value.trim();
}

function getNumberValue(name) {
  return Number(form.elements[name].value);
}

function displayProductImage(imageUrl) {
  if (!imageUrl) {
    previewImage.removeAttribute("src");
    imagePreview.hidden = true;
    return;
  }

  previewImage.src = imageUrl;
  imagePreview.hidden = false;
}

async function loadProduct() {
  try {
    const response = await api.products.getById(productId);
    const product = response?.data?.product ?? response?.product;

    if (!product) {
      throw new ApiError("Product was not found.", {
        status: 404,
      });
    }

    setValue("name", product.name);
    setValue("description", product.description);
    setValue("category", product.category);
    setValue("price", product.price);
    setValue("size", product.size);
    setValue("quantity", product.quantity);
    setValue("status", product.status);
    setValue("color", product.color);

    displayProductImage(product.image);
    imageInput.required = false;
    imageHelp.textContent = "Leave the image empty to keep the current image.";
  } catch (error) {
    showMessage(
      error instanceof ApiError ? error.message : "Unable to load the product.",
    );

    submitButton.disabled = true;
  }
}

async function createProduct() {
  const image = imageInput.files[0];

  if (!image) {
    throw new ApiError("Please select a product image.", {
      status: 400,
    });
  }

  const product = {
    name: getFormValue("name"),
    description: getFormValue("description"),
    category: getFormValue("category"),
    price: getNumberValue("price"),
    size: getFormValue("size"),
    quantity: getNumberValue("quantity"),
    status: getFormValue("status"),
    color: getFormValue("color"),
    image,
  };

  await api.products.create(product);
}

async function updateProduct() {
  const formData = new FormData();

  formData.append("name", getFormValue("name"));
  formData.append("description", getFormValue("description"));
  formData.append("category", getFormValue("category"));
  formData.append("price", getNumberValue("price"));
  formData.append("size", getFormValue("size"));
  formData.append("quantity", getNumberValue("quantity"));
  formData.append("status", getFormValue("status"));
  formData.append("color", getFormValue("color"));

  const image = imageInput.files[0];

  if (image) {
    formData.append("image", image);
  }

  await api.products.update(productId, formData);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideMessage();
  setSubmitting(true);

  try {
    if (isEditMode) {
      await updateProduct();
      showMessage("Product updated successfully.", "success");
    } else {
      await createProduct();
      showMessage("Product created successfully.", "success");
      form.reset();
      displayProductImage("");
    }

    if (isEditMode) {
      window.setTimeout(() => {
        window.location.href = "./admin-products.html";
      }, 800);
    }
  } catch (error) {
    showMessage(
      error instanceof ApiError ? error.message : "Unable to save the product.",
    );
  } finally {
    setSubmitting(false);
  }
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) {
    return;
  }

  displayProductImage(URL.createObjectURL(file));
});

function initializePage() {
  if (!isAuthenticated()) {
    showMessage("Please log in to manage products.");
    disableForm();
    return;
  }

  if (!hasRole("inventory-manager", "super-admin")) {
    showMessage(
      isEditMode
        ? "You do not have permission to edit products."
        : "You do not have permission to create products.",
    );

    disableForm();
    return;
  }

  const user = getCurrentUser();

  if (!user?.role) {
    showMessage("Your account role could not be verified.");
    disableForm();
    return;
  }

  if (isEditMode) {
    formTitle.textContent = "Edit Product";
    formDescription.textContent = "Update the selected product.";
    imageInput.required = false;

    loadProduct();
  } else {
    formTitle.textContent = "Add Product";
    formDescription.textContent = "Create a new product for the inventory.";
    imageInput.required = true;
  }
}

initializePage();
