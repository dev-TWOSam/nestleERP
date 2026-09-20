const request = require("supertest");
const app = require("../app");

describe("nestleERP backend health check", () => {
  test("GET /health returns a healthy status response", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("OK");
    expect(response.body.message).toBe("nestleERP backend is running");
  });
});
