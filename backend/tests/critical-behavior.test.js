const request = require("supertest");
const app = require("../app");

describe("critical backend behavior", () => {
  test("GET /health returns a healthy status response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("OK");
    expect(response.body.message).toBe("nestleERP backend is running");
  });

  test("POST /api/users/login rejects a missing payload", async () => {
    const response = await request(app).post("/api/users/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/email|password/i);
  });

  test("POST /api/users/password/forgot validates an invalid email on the registered route", async () => {
    const response = await request(app)
      .post("/api/users/password/forgot")
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
  });

  test.each([
    "/api/users/password/change",
    "/api/users/password/verify-otp",
    "/api/users/password/reset",
  ])("POST %s is registered and validates an empty request", async (path) => {
    const response = await request(app).post(path);
    expect(response.status).toBe(400);
  });

  test("bootstrap route rejects requests without its configured secret", async () => {
    const originalToken = process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN;
    process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN = "route-test-secret";
    try {
      const response = await request(app)
        .post("/api/users/bootstrap/super-admin")
        .send({});
      expect(response.status).toBe(401);
    } finally {
      if (originalToken === undefined) {
        delete process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN;
      } else {
        process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN = originalToken;
      }
    }
  });

  test("POST /api/users rejects incomplete signup data", async () => {
    const response = await request(app).post("/api/users").send({
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/required|valid/i);
  });
});
