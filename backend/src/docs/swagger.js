const productFormSchema = {
  type: "object",

  required: [
    "name",
    "description",
    "category",
    "price",
    "size",
    "quantity",
    "color",
  ],

  properties: {
    name: {
      type: "string",
      example: "Milo Chocolate Drink",
    },

    description: {
      type: "string",
      example: "Chocolate malt beverage",
    },

    category: {
      type: "string",
      example: "Beverages",
    },

    price: {
      type: "number",
      example: 2500,
    },

    size: {
      type: "string",
      example: "500g",
    },

    quantity: {
      type: "integer",
      minimum: 0,
      example: 25,
    },

    status: {
      type: "string",

      enum: [
        "In Stock",
        "Inactive",
        "Out of Stock",
      ],

      example: "In Stock",
    },

    color: {
      type: "string",
      example: "Brown",
    },

    image: {
      type: "string",
      format: "binary",
    },
  },
};


const swaggerDocument = {
  openapi: "3.0.3",

  info: {
    title: "Nestle ERP Search API",

    version: "1.0.0",

    description: `
Group 25 TS Academy Capstone Project.

Topic 25: Search API.

The API provides product search, filtering, sorting,
pagination, product management, authentication and
role-based administration.
    `.trim(),
  },


  servers: [
    {
      url:
        process.env.API_BASE_URL ||
        "http://localhost:4001",

      description:
        "Current API server",
    },
  ],


  tags: [
    {
      name: "Health",
      description:
        "API health checks",
    },

    {
      name: "Products",
      description:
        "Product Search API and CRUD operations",
    },

    {
      name: "Users",
      description:
        "Authentication and user management",
    },
  ],


  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },


    schemas: {
      ErrorResponse: {
        type: "object",

        properties: {
          success: {
            type: "boolean",
            example: false,
          },

          message: {
            type: "string",
            example:
              "Product not found",
          },

          data: {
            nullable: true,
            example: null,
          },
        },
      },


      Product: {
        type: "object",

        properties: {
          _id: {
            type: "string",

            example:
              "507f1f77bcf86cd799439011",
          },

          name: {
            type: "string",
            example: "Milo",
          },

          description: {
            type: "string",
            example:
              "Chocolate malt beverage",
          },

          category: {
            type: "string",
            example: "Beverages",
          },

          price: {
            type: "number",
            example: 2500,
          },

          size: {
            type: "string",
            example: "500g",
          },

          quantity: {
            type: "integer",
            minimum: 0,
            example: 20,
          },

          status: {
            type: "string",

            enum: [
              "In Stock",
              "Inactive",
              "Out of Stock",
            ],

            example: "In Stock",
          },

          color: {
            type: "string",
            example: "Brown",
          },

          image: {
            type: "string",
            example:
              "https://res.cloudinary.com/example/image/upload/product.jpg",
          },

          createdAt: {
            type: "string",
            format: "date-time",
          },

          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },


      Pagination: {
        type: "object",

        properties: {
          page: {
            type: "integer",
            example: 1,
          },

          limit: {
            type: "integer",
            example: 10,
          },

          totalItems: {
            type: "integer",
            example: 25,
          },

          totalPages: {
            type: "integer",
            example: 3,
          },

          hasNextPage: {
            type: "boolean",
            example: true,
          },

          hasPreviousPage: {
            type: "boolean",
            example: false,
          },
        },
      },


      User: {
        type: "object",

        properties: {
          _id: {
            type: "string",

            example:
              "507f1f77bcf86cd799439011",
          },

          firstName: {
            type: "string",
            example: "John",
          },

          lastName: {
            type: "string",
            example: "Doe",
          },

          gender: {
            type: "string",

            enum: [
              "Male",
              "Female",
            ],

            example: "Male",
          },

          email: {
            type: "string",
            format: "email",

            example:
              "john@example.com",
          },

          phone: {
            type: "string",
            example: "+2348012345678",
          },

          location: {
            type: "string",
            example: "Lagos",
          },

          address: {
            type: "string",

            example:
              "10 Example Street",
          },

          role: {
            type: "string",

            enum: [
              "user",
              "inventory-manager",
              "super-admin",
            ],

            example:
              "inventory-manager",
          },

          HasAdminAccess: {
            type: "boolean",
            example: true,
          },
        },
      },
    },
  },


  paths: {
    "/health": {
      get: {
        tags: ["Health"],

        summary:
          "Check API health",

        responses: {
          200: {
            description:
              "Backend is running",
          },
        },
      },
    },


    "/api/products": {
      get: {
        tags: ["Products"],

        summary:
          "Search, filter, sort and paginate products",

        description:
          "Main Topic 25 Search API endpoint.",

        parameters: [
          {
            name: "search",
            in: "query",

            schema: {
              type: "string",
            },

            description:
              "Search by product name, description, category or MongoDB product ID.",

            example: "Milo",
          },

          {
            name: "category",
            in: "query",

            schema: {
              type: "string",
            },

            example:
              "Beverages",
          },

          {
            name: "minPrice",
            in: "query",

            schema: {
              type: "number",
              minimum: 0,
            },

            example: 1000,
          },

          {
            name: "maxPrice",
            in: "query",

            schema: {
              type: "number",
              minimum: 0,
            },

            example: 5000,
          },

          {
            name: "sortBy",
            in: "query",

            schema: {
              type: "string",

              enum: [
                "name",
                "price",
                "category",
                "quantity",
                "status",
                "createdAt",
                "updatedAt",
              ],

              default:
                "createdAt",
            },
          },

          {
            name: "sortOrder",
            in: "query",

            schema: {
              type: "string",

              enum: [
                "asc",
                "desc",
              ],

              default: "desc",
            },
          },

          {
            name: "page",
            in: "query",

            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
          },

          {
            name: "limit",
            in: "query",

            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
          },
        ],

        responses: {
          200: {
            description:
              "Products retrieved successfully",

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },

                    message: {
                      type: "string",

                      example:
                        "Products retrieved successfully",
                    },

                    data: {
                      type: "object",

                      properties: {
                        products: {
                          type: "array",

                          items: {
                            $ref:
                              "#/components/schemas/Product",
                          },
                        },

                        pagination: {
                          $ref:
                            "#/components/schemas/Pagination",
                        },
                      },
                    },
                  },
                },
              },
            },
          },

          400: {
            description:
              "Invalid search/filter parameters",

            content: {
              "application/json": {
                schema: {
                  $ref:
                    "#/components/schemas/ErrorResponse",
                },
              },
            },
          },

          500: {
            description:
              "Server error",
          },
        },
      },


      post: {
        tags: ["Products"],

        summary:
          "Create a product",

        security: [
          {
            bearerAuth: [],
          },
        ],

        description:
          "Inventory Manager or Super Admin only.",

        requestBody: {
          required: true,

          content: {
            "multipart/form-data": {
              schema: productFormSchema,
            },
          },
        },

        responses: {
          201: {
            description:
              "Product created successfully",
          },

          400: {
            description:
              "Invalid product data",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Insufficient permission",
          },
        },
      },
    },


    "/api/products/categories": {
      get: {
        tags: ["Products"],

        summary:
          "Get product categories",

        responses: {
          200: {
            description:
              "Categories retrieved successfully",

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  properties: {
                    success: {
                      type: "boolean",
                    },

                    message: {
                      type: "string",
                    },

                    data: {
                      type: "object",

                      properties: {
                        categories: {
                          type: "array",

                          items: {
                            type: "string",
                          },

                          example: [
                            "Beverages",
                            "Food",
                            "Snacks",
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },


    "/api/products/categories/{category}": {
      get: {
        tags: ["Products"],

        summary:
          "Get products by category",

        parameters: [
          {
            name: "category",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },

            example:
              "Beverages",
          },
        ],

        responses: {
          200: {
            description:
              "Category query completed successfully",
          },

          400: {
            description:
              "Invalid category",
          },
        },
      },
    },


    "/api/products/{id}": {
      get: {
        tags: ["Products"],

        summary:
          "Get a product by ID",

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        responses: {
          200: {
            description:
              "Product retrieved successfully",
          },

          400: {
            description:
              "Invalid product ID",
          },

          404: {
            description:
              "Product not found",
          },
        },
      },


      put: {
        tags: ["Products"],

        summary:
          "Update a product",

        security: [
          {
            bearerAuth: [],
          },
        ],

        description:
          "Inventory Manager or Super Admin only.",

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        requestBody: {
          required: true,

          content: {
            "multipart/form-data": {
              schema: productFormSchema,
            },
          },
        },

        responses: {
          200: {
            description:
              "Product updated successfully",
          },

          400: {
            description:
              "Invalid product ID or product data",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Insufficient permission",
          },

          404: {
            description:
              "Product not found",
          },
        },
      },


      delete: {
        tags: ["Products"],

        summary:
          "Delete a product",

        security: [
          {
            bearerAuth: [],
          },
        ],

        description:
          "Inventory Manager or Super Admin only.",

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        responses: {
          200: {
            description:
              "Product deleted successfully",
          },

          400: {
            description:
              "Invalid product ID",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Insufficient permission",
          },

          404: {
            description:
              "Product not found",
          },
        },
      },
    },


    "/api/users": {
      post: {
        tags: ["Users"],

        summary:
          "Register a user",

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",

                required: [
                  "firstName",
                  "lastName",
                  "gender",
                  "email",
                  "password",
                  "location",
                  "phoneCountryCode",
                  "phone",
                  "address",
                ],

                properties: {
                  firstName: {
                    type: "string",
                    example: "John",
                  },

                  lastName: {
                    type: "string",
                    example: "Doe",
                  },

                  gender: {
                    type: "string",

                    enum: [
                      "Male",
                      "Female",
                    ],
                  },

                  email: {
                    type: "string",
                    format: "email",

                    example:
                      "john@example.com",
                  },

                  password: {
                    type: "string",

                    example:
                      "StrongPass123!",
                  },

                  location: {
                    type: "string",
                    example: "Lagos",
                  },

                  phoneCountryCode: {
                    type: "string",
                    example: "+234",
                  },

                  phone: {
                    type: "string",
                    example: "8012345678",
                  },

                  address: {
                    type: "string",

                    example:
                      "10 Example Street",
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description:
              "User created successfully",
          },

          400: {
            description:
              "Invalid registration data",
          },
        },
      },


      get: {
        tags: ["Users"],

        summary:
          "Get all users",

        security: [
          {
            bearerAuth: [],
          },
        ],

        description:
          "Super Admin only.",

        responses: {
          200: {
            description:
              "Users retrieved successfully",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Super Admin access required",
          },
        },
      },
    },


    "/api/users/login": {
      post: {
        tags: ["Users"],

        summary:
          "Log in",

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",

                required: [
                  "email",
                  "password",
                ],

                properties: {
                  email: {
                    type: "string",
                    format: "email",

                    example:
                      "admin@example.com",
                  },

                  password: {
                    type: "string",

                    example:
                      "StrongPass123!",
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description:
              "Login successful",

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  properties: {
                    message: {
                      type: "string",
                      example:
                        "Login successful",
                    },

                    token: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },

          400: {
            description:
              "Email/password missing",
          },

          401: {
            description:
              "Invalid credentials",
          },

          404: {
            description:
              "Invalid credentials",
          },
        },
      },
    },


    "/api/users/staff": {
      post: {
        tags: ["Users"],

        summary:
          "Create a staff account",

        description:
          "Super Admin only.",

        security: [
          {
            bearerAuth: [],
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",

                required: [
                  "firstName",
                  "lastName",
                  "gender",
                  "email",
                  "password",
                  "location",
                  "phoneCountryCode",
                  "phone",
                  "address",
                  "role",
                ],

                properties: {
                  firstName: {
                    type: "string",
                    example: "Jane",
                  },

                  lastName: {
                    type: "string",
                    example: "Doe",
                  },

                  gender: {
                    type: "string",

                    enum: [
                      "Male",
                      "Female",
                    ],
                  },

                  email: {
                    type: "string",
                    format: "email",

                    example:
                      "staff@example.com",
                  },

                  password: {
                    type: "string",

                    example:
                      "StrongPass123!",
                  },

                  location: {
                    type: "string",
                    example: "Lagos",
                  },

                  phoneCountryCode: {
                    type: "string",
                    example: "+234",
                  },

                  phone: {
                    type: "string",
                    example: "8012345679",
                  },

                  address: {
                    type: "string",

                    example:
                      "20 Example Street",
                  },

                  role: {
                    type: "string",

                    enum: [
                      "inventory-manager",
                      "super-admin",
                    ],
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description:
              "Staff account created successfully",
          },

          400: {
            description:
              "Invalid staff data",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Super Admin access required",
          },

          409: {
            description:
              "Email or phone already exists",
          },
        },
      },
    },


    "/api/users/{id}": {
      get: {
        tags: ["Users"],

        summary:
          "Get user by ID",

        description:
          "Super Admin only.",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        responses: {
          200: {
            description:
              "User retrieved successfully",
          },

          400: {
            description:
              "Invalid user ID",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Super Admin access required",
          },

          404: {
            description:
              "User not found",
          },
        },
      },


      put: {
        tags: ["Users"],

        summary:
          "Update user or staff role",

        description:
          "Super Admin only.",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",

                properties: {
                  firstName: {
                    type: "string",
                  },

                  lastName: {
                    type: "string",
                  },

                  email: {
                    type: "string",
                    format: "email",
                  },

                  phoneCountryCode: {
                    type: "string",
                  },

                  phone: {
                    type: "string",
                  },

                  location: {
                    type: "string",
                  },

                  address: {
                    type: "string",
                  },

                  role: {
                    type: "string",

                    enum: [
                      "user",
                      "inventory-manager",
                      "super-admin",
                    ],
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description:
              "User updated successfully",
          },

          400: {
            description:
              "Invalid user data or ID",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Super Admin access required",
          },

          404: {
            description:
              "User not found",
          },

          409: {
            description:
              "Email or phone already exists",
          },
        },
      },


      delete: {
        tags: ["Users"],

        summary:
          "Delete a user",

        description:
          "Super Admin only.",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        responses: {
          200: {
            description:
              "User deleted successfully",
          },

          400: {
            description:
              "Invalid user ID",
          },

          401: {
            description:
              "Authentication required",
          },

          403: {
            description:
              "Super Admin access required",
          },

          404: {
            description:
              "User not found",
          },
        },
      },
    },
  },
};


module.exports =
  swaggerDocument;