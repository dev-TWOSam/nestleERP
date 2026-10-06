const request = require("supertest");

/*
 * Mock the Product model so these tests
 * do not require a real MongoDB connection.
 */
jest.mock("../src/models/products", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const Product = require("../src/models/products");
const app = require("../app");

/*
 * Creates a mock Mongoose query chain:
 *
 * Product.find(...)
 *   .sort(...)
 *   .skip(...)
 *   .limit(...)
 */
function mockProductQuery(
  products = [],
  totalItems = products.length,
) {
  const query = {
    sort: jest.fn().mockReturnThis(),

    skip: jest.fn().mockReturnThis(),

    limit: jest
      .fn()
      .mockResolvedValue(products),
  };

  Product.find.mockReturnValue(query);

  Product.countDocuments.mockResolvedValue(
    totalItems,
  );

  return query;
}

describe(
  "GET /api/products - Search API",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    /* =========================================
       PAGINATION
    ========================================= */

    test(
      "returns paginated products with pagination metadata",
      async () => {
        const products = [
          {
            _id: "1",
            name: "Milo",
            price: 2500,
          },

          {
            _id: "2",
            name: "Nescafe",
            price: 3000,
          },
        ];

        const query =
          mockProductQuery(
            products,
            5,
          );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              page: 2,
              limit: 2,
            });

        expect(
          response.status,
        ).toBe(200);

        expect(
          Product.find,
        ).toHaveBeenCalledWith(
          {},
        );

        expect(
          query.sort,
        ).toHaveBeenCalledWith({
          createdAt: -1,
          _id: 1,
        });

        /*
         * Page 2 with limit 2
         *
         * skip =
         * (2 - 1) * 2
         * = 2
         */
        expect(
          query.skip,
        ).toHaveBeenCalledWith(
          2,
        );

        expect(
          query.limit,
        ).toHaveBeenCalledWith(
          2,
        );

        expect(
          Product.countDocuments,
        ).toHaveBeenCalledWith(
          {},
        );

        expect(
          response.body.data
            .products,
        ).toEqual(products);

        expect(
          response.body.data
            .pagination,
        ).toEqual({
          page: 2,

          limit: 2,

          totalItems: 5,

          totalPages: 3,

          hasNextPage: true,

          hasPreviousPage: true,
        });
      },
    );

    /* =========================================
       TEXT SEARCH
    ========================================= */

    test(
      "searches text fields case-insensitively",
      async () => {
        mockProductQuery(
          [],
          0,
        );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              search: "milo",
            });

        expect(
          response.status,
        ).toBe(200);

        const filter =
          Product.find.mock
            .calls[0][0];

        expect(
          filter.$or,
        ).toHaveLength(
          3,
        );

        /*
         * Search name
         */
        expect(
          filter.$or[0].name,
        ).toBeInstanceOf(
          RegExp,
        );

        expect(
          filter.$or[0].name.test(
            "MILO Chocolate Drink",
          ),
        ).toBe(true);

        /*
         * Search description
         */
        expect(
          filter.$or[1]
            .description.test(
              "Contains Milo powder",
            ),
        ).toBe(true);

        /*
         * Search category
         */
        expect(
          filter.$or[2]
            .category.test(
              "Milo Products",
            ),
        ).toBe(true);
      },
    );

    /* =========================================
       SEARCH BY PRODUCT ID
    ========================================= */

    test(
      "supports searching by a valid MongoDB product ID",
      async () => {
        mockProductQuery(
          [],
          0,
        );

        const productId =
          "507f1f77bcf86cd799439011";

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              search:
                productId,
            });

        expect(
          response.status,
        ).toBe(200);

        const filter =
          Product.find.mock
            .calls[0][0];

        expect(
          filter.$or,
        ).toEqual(
          expect.arrayContaining(
            [
              {
                _id:
                  productId,
              },
            ],
          ),
        );
      },
    );

    /* =========================================
       CATEGORY + PRICE FILTER
    ========================================= */

    test(
      "filters products by category and price range",
      async () => {
        mockProductQuery(
          [],
          0,
        );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              category:
                "Beverages",

              minPrice:
                1000,

              maxPrice:
                5000,
            });

        expect(
          response.status,
        ).toBe(200);

        const filter =
          Product.find.mock
            .calls[0][0];

        /*
         * Category should be
         * case-insensitive.
         */
        expect(
          filter.category,
        ).toBeInstanceOf(
          RegExp,
        );

        expect(
          filter.category.test(
            "Beverages",
          ),
        ).toBe(true);

        expect(
          filter.category.test(
            "beverages",
          ),
        ).toBe(true);

        /*
         * It should be an exact
         * category match.
         */
        expect(
          filter.category.test(
            "Hot Beverages",
          ),
        ).toBe(false);

        expect(
          filter.price,
        ).toEqual({
          $gte: 1000,
          $lte: 5000,
        });
      },
    );

    /* =========================================
       SORTING
    ========================================= */

    test(
      "sorts products by price ascending",
      async () => {
        const query =
          mockProductQuery(
            [],
            0,
          );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              sortBy:
                "price",

              sortOrder:
                "asc",
            });

        expect(
          response.status,
        ).toBe(200);

        expect(
          query.sort,
        ).toHaveBeenCalledWith({
          price: 1,
          _id: 1,
        });
      },
    );

    test(
      "sorts products by price descending",
      async () => {
        const query =
          mockProductQuery(
            [],
            0,
          );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              sortBy:
                "price",

              sortOrder:
                "desc",
            });

        expect(
          response.status,
        ).toBe(200);

        expect(
          query.sort,
        ).toHaveBeenCalledWith({
          price: -1,
          _id: 1,
        });
      },
    );

    /* =========================================
       COMBINED SEARCH API
    ========================================= */

    test(
      "supports search, filters, sorting and pagination together",
      async () => {
        const products = [
          {
            _id: "1",
            name: "Milo",
            price: 2500,
          },
        ];

        const query =
          mockProductQuery(
            products,
            11,
          );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              search:
                "milo",

              category:
                "Beverages",

              minPrice:
                1000,

              maxPrice:
                5000,

              sortBy:
                "price",

              sortOrder:
                "asc",

              page:
                2,

              limit:
                5,
            });

        expect(
          response.status,
        ).toBe(200);

        const filter =
          Product.find.mock
            .calls[0][0];

        /*
         * Search
         */
        expect(
          filter.$or,
        ).toBeDefined();

        /*
         * Category
         */
        expect(
          filter.category,
        ).toBeInstanceOf(
          RegExp,
        );

        /*
         * Price
         */
        expect(
          filter.price,
        ).toEqual({
          $gte: 1000,
          $lte: 5000,
        });

        /*
         * Sorting
         */
        expect(
          query.sort,
        ).toHaveBeenCalledWith({
          price: 1,
          _id: 1,
        });

        /*
         * Pagination
         *
         * (page 2 - 1) * 5
         * = skip 5
         */
        expect(
          query.skip,
        ).toHaveBeenCalledWith(
          5,
        );

        expect(
          query.limit,
        ).toHaveBeenCalledWith(
          5,
        );

        expect(
          response.body.data
            .pagination,
        ).toEqual({
          page: 2,

          limit: 5,

          totalItems: 11,

          totalPages: 3,

          hasNextPage: true,

          hasPreviousPage: true,
        });
      },
    );

    /* =========================================
       EMPTY SEARCH RESULT
    ========================================= */

    test(
      "returns 200 with an empty result set",
      async () => {
        mockProductQuery(
          [],
          0,
        );

        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              search:
                "does-not-exist",
            });

        expect(
          response.status,
        ).toBe(200);

        expect(
          response.body.data
            .products,
        ).toEqual([]);

        expect(
          response.body.data
            .pagination
            .totalItems,
        ).toBe(0);

        expect(
          response.body.data
            .pagination
            .totalPages,
        ).toBe(0);
      },
    );

    /* =========================================
       INVALID PAGE
    ========================================= */

    test(
      "rejects page 0",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              page: 0,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .success,
        ).toBe(false);

        expect(
          response.body
            .message,
        ).toBe(
          "Page must be a positive integer",
        );

        expect(
          Product.find,
        ).not.toHaveBeenCalled();
      },
    );

    test(
      "rejects a non-numeric page",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              page: "abc",
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toBe(
          "Page must be a positive integer",
        );
      },
    );

    /* =========================================
       INVALID LIMIT
    ========================================= */

    test(
      "rejects limit 0",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              limit: 0,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toBe(
          "Limit must be an integer between 1 and 100",
        );
      },
    );

    test(
      "rejects a limit greater than 100",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              limit: 101,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toBe(
          "Limit must be an integer between 1 and 100",
        );
      },
    );

    /* =========================================
       INVALID SORTING
    ========================================= */

    test(
      "rejects an invalid sort field",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              sortBy:
                "password",
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toContain(
          "sortBy must be one of",
        );
      },
    );

    test(
      "rejects an invalid sort order",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              sortOrder:
                "random",
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toContain(
          "sortOrder must be either",
        );
      },
    );

    /* =========================================
       INVALID PRICE FILTERS
    ========================================= */

    test(
      "rejects a negative minimum price",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              minPrice:
                -1,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toBe(
          "Minimum price must be a non-negative number",
        );
      },
    );

    test(
      "rejects a negative maximum price",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              maxPrice:
                -1,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toBe(
          "Maximum price must be a non-negative number",
        );
      },
    );

    test(
      "rejects minimum price greater than maximum price",
      async () => {
        const response =
          await request(app)
            .get(
              "/api/products",
            )
            .query({
              minPrice:
                5000,

              maxPrice:
                1000,
            });

        expect(
          response.status,
        ).toBe(400);

        expect(
          response.body
            .message,
        ).toBe(
          "Minimum price cannot be greater than maximum price",
        );
      },
    );
  },
);