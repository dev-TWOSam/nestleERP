const request = require("supertest");
const bcrypt = require("bcrypt");
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

  test("creates a valid normal user with shared validation helpers", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
    jest.spyOn(User.prototype, "save").mockResolvedValue();

    const req = {
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        gender: "Female",
        email: " Ada@Example.com ",
        password: "StrongPass1!",
        location: "Lagos",
        phoneCountryCode: "+234",
        phone: "8012345678",
        address: "10 Main Road",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await userController.createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].user.email).toBe("ada@example.com");
    expect(res.json.mock.calls[0][0].user).not.toHaveProperty("password");
    expect(bcrypt.hash).toHaveBeenCalledWith("StrongPass1!", "salt");
  });

  test("createStaff accepts the supplied password and does not auto-generate one", async () => {
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

    const hashSpy = jest.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
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
        password: "StrongPass1!",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await userController.createStaff(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(hashSpy).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith("StrongPass1!", "salt");
    expect(saveMock).toHaveBeenCalled();
    expect(saveMock.mock.instances[0].mustChangePassword).toBe(true);
    expect(
      saveMock.mock.instances[0].temporaryPasswordExpiresAt,
    ).toBeInstanceOf(Date);
  });

  test("login with a temporary password requires a change and returns no token", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({
      password: "hashed-temporary-password",
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
    });
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await userController.login(
      { body: { email: "staff@example.com", password: "TemporaryPass1!" } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      passwordChangeRequired: true,
    });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("token");
  });

  test("searchProducts supports name, id and category/price/size filters with strict validation", async () => {
    const products = [
      {
        _id: "507f1f77bcf86cd799439011",
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

    const findSpy = jest.spyOn(Product, "find").mockReturnValue({
      sort: jest.fn().mockResolvedValue(products),
    });

    const validReq = {
      query: {
        name: "Smart",
        category: "Electronics",
        price: "25000",
        size: "42mm",
      },
    };
    const validRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await productController.searchProducts(validReq, validRes);

    expect(validRes.status).toHaveBeenCalledWith(200);
    const payload = validRes.json.mock.calls[0][0];
    expect(
      payload.products.some((product) => product.name === "Smart Watch"),
    ).toBe(true);

    const invalidReq = { query: { price: "not-a-number" } };
    const invalidRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await productController.searchProducts(invalidReq, invalidRes);

    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const byIdReq = { query: { id: "507f1f77bcf86cd799439011" } };
    const byIdRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await productController.searchProducts(byIdReq, byIdRes);

    expect(byIdRes.status).toHaveBeenCalledWith(200);
    const byIdPayload = byIdRes.json.mock.calls[0][0];
    expect(byIdPayload.products[0]._id).toBe("507f1f77bcf86cd799439011");
    expect(findSpy).toHaveBeenLastCalledWith({
      _id: "507f1f77bcf86cd799439011",
    });

    const invalidIdRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await productController.searchProducts(
      { query: { id: "not-an-object-id" } },
      invalidIdRes,
    );
    expect(invalidIdRes.status).toHaveBeenCalledWith(400);

    const regexRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await productController.searchProducts(
      { query: { name: "(Smart|Office).*" } },
      regexRes,
    );
    expect(regexRes.status).toHaveBeenCalledWith(200);
    expect(findSpy).toHaveBeenLastCalledWith({
      name: { $regex: "\\(Smart\\|Office\\)\\.\\*", $options: "i" },
    });
  });
});
