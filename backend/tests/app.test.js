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

test(
  "returns 404 for an unknown route",
  async () => {
    const response =
      await request(app)
        .get(
          "/api/does-not-exist",
        );

    expect(
      response.status,
    ).toBe(404);

    expect(
      response.body,
    ).toEqual({
      success: false,
      message:
        "Route not found: GET /api/does-not-exist",
      data: null,
    });
  },
);