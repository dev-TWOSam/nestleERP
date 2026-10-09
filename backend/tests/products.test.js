const Product = require("../src/models/products");
const productController = require("../src/controllers/products");

describe("product numeric fields", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("createProduct accepts a price of 1 and zero quantity", async () => {
    jest.spyOn(Product, "create").mockResolvedValue({ _id: "product-id" });
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await productController.createProduct(
      {
        body: {
          name: "Sample",
          description: "Sample product",
          category: "Other",
          price: 1,
          size: "One size",
          quantity: 0,
          color: "Black",
        },
        file: { path: "https://example.com/sample.png" },
      },
      res,
    );

    expect(Product.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 1, quantity: 0 }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("createProduct rejects a price below 1", async () => {
    const createSpy = jest.spyOn(Product, "create");
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await productController.createProduct(
      {
        body: {
          name: "Sample",
          description: "Sample product",
          category: "Other",
          price: 0,
          size: "One size",
          quantity: 1,
          color: "Black",
        },
        file: { path: "https://example.com/sample.png" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Price must be at least 1" });
    expect(createSpy).not.toHaveBeenCalled();
  });

  test("updateProduct persists zero quantity when price is omitted", async () => {
    const product = {
      _id: "product-id",
      price: 12,
      quantity: 5,
      image: "https://example.com/sample.png",
    };
    jest.spyOn(Product, "findById").mockResolvedValue(product);
    jest
      .spyOn(Product, "findByIdAndUpdate")
      .mockResolvedValue({ ...product, price: 0, quantity: 0 });
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await productController.updateProduct(
      {
        params: { id: "product-id" },
        body: { quantity: 0 },
      },
      res,
    );

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      "product-id",
      expect.objectContaining({ price: 12, quantity: 0 }),
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("updateProduct rejects a price below 1", async () => {
    const product = {
      _id: "product-id",
      price: 12,
      quantity: 5,
      image: "https://example.com/sample.png",
    };
    jest.spyOn(Product, "findById").mockResolvedValue(product);
    const updateSpy = jest.spyOn(Product, "findByIdAndUpdate");
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await productController.updateProduct(
      {
        params: { id: "product-id" },
        body: { price: "0" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Price must be at least 1" });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
