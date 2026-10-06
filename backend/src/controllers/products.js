const mongoose = require("mongoose");
const Product = require("../models/products");
const cloudinary = require("../config/cloudinary");

const ALLOWED_PRODUCT_STATUSES = [
  "In Stock",
  "Inactive",
  "Out of Stock",
];

const isMissing = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" &&
    value.trim() === "");

const hasField = (body, field) =>
  Object.prototype.hasOwnProperty.call(
    body,
    field,
  );
  
  // Create a product with image upload to Cloudinary
// Create product
exports.createProduct = async (req, res) => {
  try {
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

    // =====================================
    // REQUIRED FIELD VALIDATION
    // =====================================

    if (
      isMissing(name) ||
      isMissing(description) ||
      isMissing(category) ||
      isMissing(price) ||
      isMissing(size) ||
      isMissing(quantity) ||
      isMissing(color)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete all required fields",
        data: null,
      });
    }

    // =====================================
    // NUMERIC VALIDATION
    // =====================================

    const priceNumber =
      Number(price);

    const quantityNumber =
      Number(quantity);

    if (
      !Number.isFinite(
        priceNumber,
      ) ||
      priceNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be a number greater than 0",
        data: null,
      });
    }

    /*
     * Quantity 0 is valid.
     *
     * Example:
     * quantity = 0
     * means the product is
     * currently out of stock.
     */

    if (
      !Number.isInteger(
        quantityNumber,
      ) ||
      quantityNumber < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a non-negative integer",
        data: null,
      });
    }

    // =====================================
    // STATUS VALIDATION
    // =====================================

    if (
      !isMissing(status) &&
      !ALLOWED_PRODUCT_STATUSES.includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Status must be one of: ${ALLOWED_PRODUCT_STATUSES.join(
            ", ",
          )}`,
        data: null,
      });
    }

    // =====================================
    // IMAGE VALIDATION
    // =====================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Image field can't be empty",
        data: null,
      });
    }

    // =====================================
    // DETERMINE STATUS
    // =====================================

    /*
     * A product with quantity 0
     * should not be "In Stock".
     */

    const productStatus =
      quantityNumber === 0
        ? "Out of Stock"
        : status || "In Stock";

    // =====================================
    // CREATE PRODUCT
    // =====================================

    const product =
      await Product.create({
        name:
          name.trim(),

        description:
          description.trim(),

        category:
          category.trim(),

        price:
          priceNumber,

        size:
          size.trim(),

        quantity:
          quantityNumber,

        status:
          productStatus,

        color:
          color.trim(),

        image:
          req.file.path ||
          req.file.secure_url,
      });

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",

      data: {
        product,
      },
    });
  } catch (error) {
    console.error(
      "Error creating product:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Error creating product",
      data: null,
    });
  }
};

// Get all products with search, filtering, sorting and pagination
exports.getAllProducts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "10",
    } = req.query;

    // ==============================
    // PAGINATION VALIDATION
    // ==============================

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
        data: null,
      });
    }

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 100",
        data: null,
      });
    }

    // ==============================
    // PRICE VALIDATION
    // ==============================

    const parsedMinPrice =
      minPrice === undefined || minPrice === ""
        ? null
        : Number(minPrice);

    const parsedMaxPrice =
      maxPrice === undefined || maxPrice === ""
        ? null
        : Number(maxPrice);

    if (
      parsedMinPrice !== null &&
      (!Number.isFinite(parsedMinPrice) || parsedMinPrice < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum price must be a non-negative number",
        data: null,
      });
    }

    if (
      parsedMaxPrice !== null &&
      (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum price must be a non-negative number",
        data: null,
      });
    }

    if (
      parsedMinPrice !== null &&
      parsedMaxPrice !== null &&
      parsedMinPrice > parsedMaxPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot be greater than maximum price",
        data: null,
      });
    }

    // ==============================
    // SORT VALIDATION
    // ==============================

    const allowedSortFields = [
      "name",
      "price",
      "category",
      "quantity",
      "status",
      "createdAt",
      "updatedAt",
    ];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `sortBy must be one of: ${allowedSortFields.join(", ")}`,
        data: null,
      });
    }

    const normalizedSortOrder = String(sortOrder).toLowerCase();

    if (!["asc", "desc"].includes(normalizedSortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'sortOrder must be either "asc" or "desc"',
        data: null,
      });
    }

    // Prevent special Regex characters from changing the search
    const escapeRegex = (value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ==============================
    // BUILD SEARCH / FILTER QUERY
    // ==============================

    const filter = {};

    const searchTerm = String(search).trim();

    if (searchTerm) {
      const searchRegex = new RegExp(
        escapeRegex(searchTerm),
        "i",
      );

      const searchConditions = [
        {
          name: searchRegex,
        },
        {
          description: searchRegex,
        },
        {
          category: searchRegex,
        },
      ];

      // Search by exact MongoDB product ID
      if (
        mongoose.Types.ObjectId.isValid(
          searchTerm,
        )
      ) {
        searchConditions.push({
          _id: searchTerm,
        });
      }

      filter.$or = searchConditions;
    }

    // ==============================
    // CATEGORY FILTER
    // ==============================

    const categoryTerm =
      String(category).trim();

    if (categoryTerm) {
      filter.category = new RegExp(
        `^${escapeRegex(categoryTerm)}$`,
        "i",
      );
    }

    // ==============================
    // PRICE FILTER
    // ==============================

    if (
      parsedMinPrice !== null ||
      parsedMaxPrice !== null
    ) {
      filter.price = {};

      if (parsedMinPrice !== null) {
        filter.price.$gte =
          parsedMinPrice;
      }

      if (parsedMaxPrice !== null) {
        filter.price.$lte =
          parsedMaxPrice;
      }
    }

    // ==============================
    // PAGINATION
    // ==============================

    const skip =
      (pageNumber - 1) *
      limitNumber;

    // ==============================
    // SORTING
    // ==============================

    const sortDirection =
      normalizedSortOrder === "desc"
        ? -1
        : 1;

    // ==============================
    // DATABASE QUERY
    // ==============================

    const [
      products,
      totalItems,
    ] = await Promise.all([
      Product.find(filter)
        .sort({
          [sortBy]:
            sortDirection,
          _id: 1,
        })
        .skip(skip)
        .limit(limitNumber),

      Product.countDocuments(
        filter,
      ),
    ]);

    const totalPages =
      Math.ceil(
        totalItems /
          limitNumber,
      );

    // ==============================
    // RESPONSE
    // ==============================

    return res.status(200).json({
      success: true,
      message:
        "Products retrieved successfully",
      data: {
        products,

        pagination: {
          page:
            pageNumber,

          limit:
            limitNumber,

          totalItems,

          totalPages,

          hasNextPage:
            pageNumber <
            totalPages,

          hasPreviousPage:
            pageNumber > 1,
        },
      },
    });
  } catch (error) {
    console.error(
      "Error fetching products:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Error retrieving products",
      data: null,
    });
  }
};

// Get all unique product categories
exports.getProductCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");

    const cleanedCategories = categories
      .filter(
        (category) =>
          typeof category === "string" &&
          category.trim() !== "",
      )
      .map((category) => category.trim())
      .sort((a, b) =>
        a.localeCompare(b),
      );

    return res.status(200).json({
      success: true,
      message:
        "Product categories retrieved successfully",
      data: {
        categories: cleanedCategories,
      },
    });
  } catch (error) {
    console.error(
      "Error retrieving product categories:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Error retrieving product categories",
      data: null,
    });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    // ==============================
    // CATEGORY VALIDATION
    // ==============================

    if (
      !category ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a category",
        data: null,
      });
    }

    // Prevent special regex characters
    // from changing the query.
    const escapeRegex = (value) =>
      String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

    const categoryTerm =
      category.trim();

    // ==============================
    // FIND PRODUCTS
    // ==============================

    const products =
      await Product.find({
        category: new RegExp(
          `^${escapeRegex(
            categoryTerm,
          )}$`,
          "i",
        ),
      }).sort({
        createdAt: -1,
      });

    // ==============================
    // SUCCESS
    // ==============================

    return res.status(200).json({
      success: true,

      message:
        products.length > 0
          ? "Products retrieved successfully"
          : "No products found in this category",

      data: {
        category:
          categoryTerm,

        products,

        totalItems:
          products.length,
      },
    });
  } catch (error) {
    console.error(
      "Error retrieving products by category:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Error retrieving products by category",
      data: null,
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // ==============================
    // ID REQUIRED
    // ==============================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Please provide the product ID",
        data: null,
      });
    }

    // ==============================
    // VALIDATE MONGODB OBJECT ID
    // ==============================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
        data: null,
      });
    }

    // ==============================
    // FIND PRODUCT
    // ==============================

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    // ==============================
    // SUCCESS
    // ==============================

    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching product:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Error fetching product",
      data: null,
    });
  }
};

//Update-product endpoint
// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } =
      req.params;

    // =====================================
    // ID VALIDATION
    // =====================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide the ID",
        data: null,
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid product ID",
        data: null,
      });
    }

    // =====================================
    // FIND EXISTING PRODUCT
    // =====================================

    const product =
      await Product.findById(
        id,
      );

    if (!product) {
      /*
       * If a new image was
       * already uploaded,
       * remove it because the
       * product doesn't exist.
       */

      if (
        req.file?.filename
      ) {
        await cloudinary.uploader.destroy(
          req.file.filename,
        );
      }

      return res.status(404).json({
        success: false,
        message:
          "Product not found",
        data: null,
      });
    }

    /*
     * We only put properties
     * into updatedData when
     * the client actually
     * supplied them.
     *
     * This fixes problems such as:
     *
     * quantity: 0
     *
     * being replaced by the
     * previous quantity.
     */

    const updatedData = {};

    // =====================================
    // STRING FIELDS
    // =====================================

    const stringFields = [
      "name",
      "description",
      "category",
      "size",
      "color",
    ];

    for (
      const field of
      stringFields
    ) {
      if (
        hasField(
          req.body,
          field,
        )
      ) {
        if (
          isMissing(
            req.body[field],
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} cannot be empty`,
            data: null,
          });
        }

        updatedData[field] =
          req.body[
            field
          ].trim();
      }
    }

    // =====================================
    // PRICE
    // =====================================

    if (
      hasField(
        req.body,
        "price",
      )
    ) {
      if (
        isMissing(
          req.body.price,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Price cannot be empty",
          data: null,
        });
      }

      const priceNumber =
        Number(
          req.body.price,
        );

      if (
        !Number.isFinite(
          priceNumber,
        ) ||
        priceNumber <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Price must be a number greater than 0",
          data: null,
        });
      }

      updatedData.price =
        priceNumber;
    }

    // =====================================
    // QUANTITY
    // =====================================

    if (
      hasField(
        req.body,
        "quantity",
      )
    ) {
      if (
        isMissing(
          req.body.quantity,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity cannot be empty",
          data: null,
        });
      }

      const quantityNumber =
        Number(
          req.body.quantity,
        );

      if (
        !Number.isInteger(
          quantityNumber,
        ) ||
        quantityNumber < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be a non-negative integer",
          data: null,
        });
      }

      /*
       * This correctly permits:
       *
       * quantity = 0
       */

      updatedData.quantity =
        quantityNumber;

      /*
       * Automatically make
       * quantity 0 Out of Stock
       * when the client did not
       * explicitly supply status.
       */

      if (
        quantityNumber === 0 &&
        !hasField(
          req.body,
          "status",
        )
      ) {
        updatedData.status =
          "Out of Stock";
      }
    }

    // =====================================
    // STATUS
    // =====================================

    if (
      hasField(
        req.body,
        "status",
      )
    ) {
      if (
        isMissing(
          req.body.status,
        ) ||
        !ALLOWED_PRODUCT_STATUSES.includes(
          req.body.status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Status must be one of: ${ALLOWED_PRODUCT_STATUSES.join(
              ", ",
            )}`,
          data: null,
        });
      }

      /*
       * Don't allow:
       *
       * quantity: 0
       * status: In Stock
       */

      if (
        updatedData.quantity ===
          0 &&
        req.body.status ===
          "In Stock"
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A product with quantity 0 cannot have status "In Stock"',
          data: null,
        });
      }

      updatedData.status =
        req.body.status;
    }

    // =====================================
    // IMAGE
    // =====================================

    if (req.file) {
      updatedData.image =
        req.file.path ||
        req.file.secure_url;

      /*
       * Delete the previous
       * Cloudinary image.
       */

      if (product.image) {
        const urlParts =
          product.image.split(
            "/",
          );

        const folderAndFile =
          urlParts
            .slice(-2)
            .join("/");

        const oldPublicId =
          folderAndFile.split(
            ".",
          )[0];

        await cloudinary.uploader.destroy(
          oldPublicId,
        );
      }
    }

    // =====================================
    // UPDATE DATABASE
    // =====================================

    const updatedProduct =
      await Product.findByIdAndUpdate(
        id,
        updatedData,
        {
          new: true,
          runValidators:
            true,
        },
      );

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",

      data: {
        product:
          updatedProduct,
      },
    });
  } catch (error) {
    /*
     * Clean up a newly uploaded
     * image if the update fails.
     */

    if (
      req.file?.filename
    ) {
      try {
        await cloudinary.uploader.destroy(
          req.file.filename,
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Error cleaning up uploaded image:",
          cleanupError,
        );
      }
    }

    console.error(
      "Error updating product:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Error updating product",
      data: null,
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // ==============================
    // ID REQUIRED
    // ==============================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Please provide the product ID",
        data: null,
      });
    }

    // ==============================
    // VALIDATE MONGODB OBJECT ID
    // ==============================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
        data: null,
      });
    }

    // ==============================
    // FIND PRODUCT FIRST
    // ==============================

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
    }

    // ==============================
    // DELETE CLOUDINARY IMAGE
    // ==============================

    if (product.image) {
      try {
        const urlParts =
          product.image.split("/");

        const folderAndFile =
          urlParts
            .slice(-2)
            .join("/");

        const publicId =
          folderAndFile.split(".")[0];

        await cloudinary.uploader.destroy(
          publicId,
        );
      } catch (imageError) {
        console.error(
          "Error deleting product image:",
          imageError,
        );

        /*
         * We do not stop the database
         * deletion just because image
         * cleanup failed.
         */
      }
    }

    // ==============================
    // DELETE PRODUCT
    // ==============================

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.error(
      "Error deleting product:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Error deleting product",
      data: null,
    });
  }
};
