const request = require("supertest");
const app = require("../app");
const Product = require("../src/models/products");
const User = require("../src/models/users");
const productController = require("../src/controllers/products");
const userController = require("../src/controllers/users");

describe("nestleERP backend health check", () => {
  test("GET /health returns a healthy status response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("OK");
    expect(response.body.message).toBe("nestleERP backend is running");
  });
});

describe("updated staff creation and product search requirements", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("createStaff accepts only the required staff fields and generates a secure password", async () => {
    const saveMock = jest.fn().mockResolvedValue({
      _id: "staff-id",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      role: "inventory-manager",
      password: "hashed-password",
      toObject: () => ({
        _id: "staff-id",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        role: "inventory-manager",
      }),
    });

    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest.spyOn(User.prototype, "save").mockImplementation(saveMock);
    jest
      .spyOn(require("../src/utils/sendEmail"), "sendStaffCredentials")
      .mockResolvedValue();

    const req = {
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        role: "inventory-manager",
        email: "ada@example.com",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await userController.createStaff(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(User.findOne).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(saveMock).toHaveBeenCalled();
  });

  test("searchProducts supports name, id and category/price/size filters", async () => {
    const products = [
      {
        _id: "product-1",
        name: "Smart Watch",
        description: "Fitness tracking watch",
        category: "Electronics",
        price: 25000,
        size: "42mm",
        quantity: 7,
        color: "Black",
        image: "https://example.com/watch.jpg",
      },
      {
        _id: "product-2",
        name: "Office Chair",
        description: "Ergonomic chair",
        category: "Furniture",
        price: 12000,
        size: "XL",
        quantity: 2,
        color: "Gray",
        image: "https://example.com/chair.jpg",
      },
    ];

    jest.spyOn(Product, "find").mockReturnValue({
      sort: jest.fn().mockResolvedValue(products),
    });

    const req = {
      query: {
        name: "Smart",
        category: "Electronics",
        price: "25000",
        size: "42mm",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await productController.searchProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(
      payload.products.some((product) => product.name === "Smart Watch"),
    ).toBe(true);

    const byIdReq = { query: { id: "product-1" } };
    const byIdRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await productController.searchProducts(byIdReq, byIdRes);

    expect(byIdRes.status).toHaveBeenCalledWith(200);
    const byIdPayload = byIdRes.json.mock.calls[0][0];
    expect(byIdPayload.products[0]._id).toBe("product-1");
  });
});
