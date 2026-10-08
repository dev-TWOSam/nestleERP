const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
const User = require("../src/models/users");
const Product = require("../src/models/products");

const describeIfMongo = process.env.MONGODB_TEST_URI ? describe : describe.skip;

describeIfMongo("database integration tests", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("creates a user and allows login", async () => {
    const createResponse = await request(app).post("/api/users").send({
      firstName: "Alice",
      lastName: "Johnson",
      gender: "Female",
      email: "alice@example.com",
      password: "StrongPass1!",
      location: "Lagos",
      phoneCountryCode: "+234",
      phone: "8012345678",
      address: "10 Main Road",
    });

    expect(createResponse.status).toBe(201);

    const loginResponse = await request(app).post("/api/users/login").send({
      email: "alice@example.com",
      password: "StrongPass1!",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeTruthy();
  });

  test("reads products from the database when available", async () => {
    const response = await request(app).get("/api/products");

    expect([200, 404]).toContain(response.status);
  });
});
