const mongoose = require("mongoose");
const Product = require("../models/products");
const cloudinary = require("../config/cloudinary"); // Import the Cloudinary configuration

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Create a product with image upload to Cloudinary
exports.createProduct = async (req, res) => {
  try {
    // Grab the data from the request body
    const {
      name,
      description,
      category,
      price,
      size,
      quantity,
      status,
      color,
    } = req.body;

    if (
      !name ||
      !description ||
      !category ||
      !price ||
      !size ||
      !quantity ||
      !color
    ) {
      return res
        .status(400)
        .json({ message: "Please complete all required fields" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image field can't be empty" });
    }

    const product = await Product.create({
      name,
      description,
      category,
      price,
      size,
      quantity,
      status: status || "In Stock",
      color,
      image: req.file.path || req.file.secure_url, // Use the secure URL from Cloudinary if available
    });

    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Error creating product:", error);
    return res
      .status(500)
      .json({ message: "Error creating product", error: error.message });
  }
};

const buildProductFilter = (query = {}) => {
  const filter = {};
  const { id, name, q, category, price, minPrice, maxPrice, size } = query;

  if (id !== undefined && id !== null && id !== "") {
    if (typeof id !== "string") {
      throw new Error("Product id must be a valid ObjectId");
    }
    const normalizedId = id.trim();
    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      throw new Error("Invalid product id format");
    }
    filter._id = normalizedId;
  }

  const rawSearchValue = name !== undefined ? name : q;
  if (rawSearchValue !== undefined) {
    if (typeof rawSearchValue !== "string") {
      throw new Error("Product name search value must be a string");
    }
    const searchValue = rawSearchValue.trim();
    if (!searchValue) {
      throw new Error("Product name search value cannot be empty");
    }
    filter.name = { $regex: escapeRegex(searchValue), $options: "i" };
  }

  if (category !== undefined && category !== null && category !== "") {
    if (typeof category !== "string") {
      throw new Error("Category filter must be a string");
    }
    const normalizedCategory = category.trim();
    if (!normalizedCategory) {
      throw new Error("Category filter cannot be empty");
    }
    filter.category = {
      $regex: escapeRegex(normalizedCategory),
      $options: "i",
    };
  }

  if (size !== undefined && size !== null && size !== "") {
    if (typeof size !== "string") {
      throw new Error("Size filter must be a string");
    }
    const normalizedSize = size.trim();
    if (!normalizedSize) {
      throw new Error("Size filter cannot be empty");
    }
    filter.size = { $regex: escapeRegex(normalizedSize), $options: "i" };
  }

  const parseAmount = (rawValue, fieldName) => {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return null;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`${fieldName} must be a valid non-negative number`);
    }

    return parsed;
  };

  const parsedPrice = parseAmount(price, "Price");
  const parsedMinPrice = parseAmount(minPrice, "Minimum price");
  const parsedMaxPrice = parseAmount(maxPrice, "Maximum price");

  if (parsedPrice !== null) {
    filter.price = parsedPrice;
  }

  if (parsedMinPrice !== null || parsedMaxPrice !== null) {
    filter.price = {
      ...(filter.price && typeof filter.price === "object" ? filter.price : {}),
      ...(parsedMinPrice !== null ? { $gte: parsedMinPrice } : {}),
      ...(parsedMaxPrice !== null ? { $lte: parsedMaxPrice } : {}),
    };
  }

  if (
    parsedMinPrice !== null &&
    parsedMaxPrice !== null &&
    parsedMinPrice > parsedMaxPrice
  ) {
    throw new Error("Minimum price cannot be greater than maximum price");
  }

  return filter;
};

//Get-all-products endpoint
exports.getAllProducts = async (req, res) => {
  try {
    const filter = buildProductFilter(req.query);
    const products = await Product.find(filter);

    if (!products || products.length === 0)
      return res.status(404).json({ message: "No product exist in the store" });

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);

    if (
      error.message.includes("Invalid") ||
      error.message.includes("must be") ||
      error.message.includes("cannot be")
    ) {
      return res.status(400).json({ message: error.message });
    }

    return res
      .status(500)
      .json({ message: "Error retrieving products", error: error.message });
  }
};

//Search-products endpoint
exports.searchProducts = async (req, res) => {
  try {
    const filter = buildProductFilter(req.query);
    const products = await Product.find(filter).sort({ createdAt: -1 });

    if (!products || products.length === 0) {
      return res.status(404).json({
        message: "No products found matching the provided search criteria",
      });
    }

    return res.status(200).json({ count: products.length, products });
  } catch (error) {
    console.error("Error searching products:", error);

    if (
      error.message.includes("Invalid") ||
      error.message.includes("must be") ||
      error.message.includes("cannot be")
    ) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Error searching products",
      error: error.message,
    });
  }
};

//Search-filter endpoint
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!category) {
      return res.status(400).json({ message: "Please provide a category" });
    }

    const products = await Product.find({
      category: { $regex: category, $options: "i" },
    });

    if (!products || products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this category" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error retrieving products by category:", error);
    return res.status(500).json({
      message: "Error retrieving products by category",
      error: error.message,
    });
  }
};

//Get-product-by-ID endpoint
exports.getProductById = async (req, res) => {
  try {
    //Grab the ID from the req parameter
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Please provide the ID" });

    //Search for the product on the DB
    const product = await Product.findById(id);

    //check if the product was found
    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ message: "Error fetching product" });
  }
};

//Update-product endpoint
exports.updateProduct = async (req, res) => {
  try {
    //Grab the ID
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Please provide the ID" });

    const product = await Product.findById(id);
    if (!product) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename); // Delete the uploaded image from Cloudinary if product not found
      }

      return res.status(404).json({ message: "Product not found" });
    }

    const {
      name,
      description,
      category,
      price,
      size,
      quantity,
      status,
      color,
    } = req.body;

    const updatedData = {
      name: name || product.name,
      description: description || product.description,
      category: category || product.category,
      price: price || product.price,
      size: size || product.size,
      quantity: quantity || product.quantity,
      status: status || product.status,
      color: color || product.color,
    };

    if (req.file) {
      updatedData.image = req.file.path || req.file.secure_url; // Use the secure URL from Cloudinary if available
      if (product.image) {
        const urlParts = product.image.split("/");
        const folderAndfile = urlParts.slice(-2).join("/"); // Get the last two parts of the URL (folder and file name)
        const oldpublicId = folderAndfile.split(".")[0]; // Remove the file extension to get the public ID

        await cloudinary.uploader.destroy(oldpublicId); // Delete the old image from Cloudinary
      }
    } else {
      updatedData.image = product.image; // Keep the existing image if no new image is uploaded
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename); // Delete the uploaded image from Cloudinary if an error occurs
    }
    console.error("Error updating product:", error);
    return res
      .status(500)
      .json({ message: "Error updating product", error: error.message });
  }
};

//Delete-product endpoint
exports.deleteProduct = async (req, res) => {
  try {
    //Grab the product ID
    const { id } = req.params;

    //Check if ID was grabbed
    if (!id) return res.status(400).json({ message: "Please provide the ID" });

    //Find and delete the product
    const product = await Product.findByIdAndDelete(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    return res
      .status(200)
      .json({ message: "Product deleted successfully", product });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res
      .status(500)
      .json({ message: "Error deleting product", error: error.message });
  }
};
