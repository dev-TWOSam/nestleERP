const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const Product = require("../src/models/products");
const User = require("../src/models/users");

const testSecret = "test-only-jwt-secret";
const originalJwtSecret = process.env.JWT_SECRET;

const createToken = (role) =>
  jwt.sign({ id: "test-user-id", role, email: "test@example.com" }, testSecret);

describe("critical backend behavior", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = testSecret;
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("GET /api/products returns the products from the database", async () => {
    const products = [{ _id: "product-1", name: "Nestle Water" }];
    jest.spyOn(Product, "find").mockResolvedValue(products);

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body.products).toEqual(products);
  });

  test("GET /api/products returns 404 when the store is empty", async () => {
    jest.spyOn(Product, "find").mockResolvedValue([]);

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("No product exist in the store");
  });

  test("POST /api/users/login returns a token for valid credentials", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({
      _id: "user-1",
      email: "test@example.com",
      password: "hashed-password",
      role: "user",
    });
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "ValidPassword1!" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(jwt.verify(response.body.token, testSecret)).toMatchObject({
      id: "user-1",
      email: "test@example.com",
      role: "user",
    });
  });

  test("POST /api/users/login rejects an incorrect password", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({
      _id: "user-1",
      email: "test@example.com",
      password: "hashed-password",
      role: "user",
    });
    jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "WrongPassword1!" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  test("protected routes reject expired tokens", async () => {
    const expiredToken = jwt.sign(
      { id: "test-user-id", role: "super-admin" },
      testSecret,
      { expiresIn: -1 },
    );

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  test("user registration rejects weak passwords before querying the database", async () => {
    const findOne = jest.spyOn(User, "findOne");

    const response = await request(app).post("/api/users").send({
      firstName: "Ada",
      lastName: "Lovelace",
      gender: "Female",
      email: "ada@example.com",
      password: "weak",
      location: "Lagos",
      phoneCountryCode: "+234",
      phone: "8012345678",
      address: "1 Test Street",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must be between 12 and 30 characters long",
    );
    expect(findOne).not.toHaveBeenCalled();
  });

  test("product creation rejects a missing image before saving", async () => {
    const create = jest.spyOn(Product, "create");

    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${createToken("inventory-manager")}`)
      .send({
        name: "Test Water",
        description: "A test product",
        category: "Beverages",
        price: 250,
        size: "500ml",
        quantity: 20,
        color: "Clear",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Image field can't be empty");
    expect(create).not.toHaveBeenCalled();
  });

  test("protected product creation rejects requests without a token", async () => {
    const response = await request(app).post("/api/products");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  test("regular users cannot create products", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${createToken("user")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have permission to perform this action",
    );
  });

  test("inventory managers cannot access super-admin user routes", async () => {
    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${createToken("inventory-manager")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You do not have permission to perform this action",
    );
  });
});
