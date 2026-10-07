jest.mock("../src/middleware/upload", () => ({
  single: () => (req, res, next) => {
    if (req.get("x-test-image-upload") === "true") {
      req.file = { path: "https://example.test/products/test-image.jpg" };
    }
    next();
  },
}));

jest.mock("../src/utils/sendEmail", () => ({
  sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
  sendStaffCredentials: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../app");
const Product = require("../src/models/products");
const User = require("../src/models/users");
const BootstrapState = require("../src/models/bootstrapState");
const {
  sendPasswordResetOtp,
  sendStaffCredentials,
} = require("../src/utils/sendEmail");

const testSecret = "integration-test-jwt-secret";
const originalJwtSecret = process.env.JWT_SECRET;
const originalBootstrapSecret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
const testMongoUri = process.env.MONGODB_TEST_URI;
const userPassword = "ValidPassword1!";
const replacementPassword = "NewSecurePassword2!";
const databaseDescribe = testMongoUri ? describe : describe.skip;

const createToken = (role) =>
  jwt.sign(
    { id: "test-admin-id", role, email: "admin@example.com" },
    testSecret,
  );

const createUser = async (overrides = {}) => {
  const password = await bcrypt.hash(userPassword, 10);
  return User.create({
    firstName: "Test",
    lastName: "Admin",
    gender: "Female",
    email: "admin@example.com",
    password,
    location: "Lagos",
    phone: "+2348012345678",
    address: "1 Test Street",
    role: "super-admin",
    ...overrides,
  });
};

const productFields = {
  name: "Test Water",
  description: "A test product",
  category: "Beverages",
  price: 250,
  size: "500ml",
  quantity: 20,
  color: "Clear",
};

const createStaffPayload = (
  email = "manager@example.com",
  phone = "8098765432",
) => ({
  name: "Inventory Manager",
  email,
  password: userPassword,
  gender: "Female",
  location: "Lagos",
  phoneCountryCode: "+234",
  phone,
  address: "1 Test Street",
});

const bootstrapPayload = (email, phone, role = "user") => ({
  firstName: "First",
  lastName: "Admin",
  email,
  password: userPassword,
  gender: "Female",
  location: "Lagos",
  phoneCountryCode: "+234",
  phone,
  address: "1 Test Street",
  role,
});

databaseDescribe("database-backed product and user behavior", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = testSecret;
    process.env.SUPER_ADMIN_BOOTSTRAP_SECRET = "bootstrap-test-secret";
    const databaseName =
      new URL(testMongoUri).pathname.split("/").filter(Boolean)[0] || "";
    if (!databaseName.toLowerCase().includes("test")) {
      throw new Error(
        "MONGODB_TEST_URI must use a database name containing 'test'",
      );
    }
    await mongoose.connect(testMongoUri);
    await Promise.all([
      Product.deleteMany({}),
      User.deleteMany({}),
      BootstrapState.deleteMany({}),
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      User.deleteMany({}),
      BootstrapState.deleteMany({}),
    ]);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
    if (originalBootstrapSecret === undefined) {
      delete process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
    } else {
      process.env.SUPER_ADMIN_BOOTSTRAP_SECRET = originalBootstrapSecret;
    }
  });

  test("user registration persists a hashed password and omits it from the response", async () => {
    const response = await request(app).post("/api/users").send({
      firstName: "Ada",
      lastName: "Lovelace",
      gender: "Female",
      email: "ada@example.com",
      password: userPassword,
      location: "Lagos",
      phoneCountryCode: "+234",
      phone: "8012345678",
      address: "1 Test Street",
      role: "super-admin",
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("user");
    expect(response.body.user.password).toBeUndefined();

    const savedUser = await User.findOne({ email: "ada@example.com" });
    expect(savedUser).not.toBeNull();
    expect(savedUser.password).not.toBe(userPassword);
    await expect(
      bcrypt.compare(userPassword, savedUser.password),
    ).resolves.toBe(true);
  });

  test.each([
    [
      "email",
      { email: "admin@example.com", phone: "8098765432" },
      "Email already exists",
    ],
    [
      "phone number",
      { email: "new@example.com", phone: "8012345678" },
      "Phone number already exists",
    ],
  ])(
    "registration rejects a duplicate %s",
    async (field, duplicate, message) => {
      await createUser();

      const response = await request(app).post("/api/users").send({
        firstName: "Ada",
        lastName: "Lovelace",
        gender: "Female",
        email: duplicate.email,
        password: userPassword,
        location: "Lagos",
        phoneCountryCode: "+234",
        phone: duplicate.phone,
        address: "1 Test Street",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
      expect(await User.countDocuments()).toBe(1);
    },
  );

  test("login authenticates a persisted user and returns a verifiable token", async () => {
    await createUser({ role: "user" });

    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "admin@example.com", password: userPassword });

    expect(response.status).toBe(200);
    expect(jwt.verify(response.body.token, testSecret)).toMatchObject({
      email: "admin@example.com",
      role: "user",
    });
  });

  test("staff creation requires a first-login password change and sends credentials", async () => {
    const response = await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${createToken("super-admin")}`)
      .send(createStaffPayload());

    expect(response.status).toBe(201);
    expect(response.body.staff.password).toBeUndefined();
    expect(response.body.staff.mustChangePassword).toBe(true);
    expect(
      new Date(response.body.staff.temporaryPasswordExpiresAt).getTime(),
    ).toBeGreaterThan(Date.now());
    expect(await User.countDocuments({ email: "manager@example.com" })).toBe(1);
    expect(sendStaffCredentials).toHaveBeenCalledWith({
      email: "manager@example.com",
      name: "Inventory Manager",
      password: userPassword,
    });
  });

  test("temporary staff credentials require a password change before login", async () => {
    await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${createToken("super-admin")}`)
      .send(createStaffPayload());

    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "manager@example.com", password: userPassword });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(response.body.token).toBeUndefined();
  });

  test("first-login password change rejects wrong passwords and mismatched confirmation", async () => {
    await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${createToken("super-admin")}`)
      .send(createStaffPayload());

    const wrongPasswordResponse = await request(app)
      .post("/api/users/password/change")
      .send({
        email: "manager@example.com",
        currentPassword: "IncorrectPassword1!",
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      });
    expect(wrongPasswordResponse.status).toBe(401);

    const mismatchResponse = await request(app)
      .post("/api/users/password/change")
      .send({
        email: "manager@example.com",
        currentPassword: userPassword,
        newPassword: replacementPassword,
        confirmPassword: "DifferentPassword3!",
      });
    expect(mismatchResponse.status).toBe(400);
  });

  test("successful first-login password change invalidates the temporary password", async () => {
    await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${createToken("super-admin")}`)
      .send(createStaffPayload());

    const response = await request(app)
      .post("/api/users/password/change")
      .send({
        email: "manager@example.com",
        currentPassword: userPassword,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      });

    expect(response.status).toBe(200);
    const staff = await User.findOne({ email: "manager@example.com" });
    expect(staff.mustChangePassword).toBe(false);
    expect(staff.temporaryPasswordExpiresAt).toBeNull();
    await expect(bcrypt.compare(userPassword, staff.password)).resolves.toBe(
      false,
    );
    await expect(
      bcrypt.compare(replacementPassword, staff.password),
    ).resolves.toBe(true);

    const oldLogin = await request(app)
      .post("/api/users/login")
      .send({ email: "manager@example.com", password: userPassword });
    const newLogin = await request(app)
      .post("/api/users/login")
      .send({ email: "manager@example.com", password: replacementPassword });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  test("expired temporary passwords cannot be changed or used to log in", async () => {
    await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${createToken("super-admin")}`)
      .send(createStaffPayload());
    await User.updateOne(
      { email: "manager@example.com" },
      { $set: { temporaryPasswordExpiresAt: new Date(Date.now() - 1000) } },
    );

    const loginResponse = await request(app)
      .post("/api/users/login")
      .send({ email: "manager@example.com", password: userPassword });
    const changeResponse = await request(app)
      .post("/api/users/password/change")
      .send({
        email: "manager@example.com",
        currentPassword: userPassword,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      });

    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.code).toBe("TEMPORARY_PASSWORD_EXPIRED");
    expect(changeResponse.status).toBe(401);
  });

  test("bootstrap creates the first Super Admin and rejects subsequent requests", async () => {
    const firstResponse = await request(app)
      .post("/api/users/bootstrap/super-admin")
      .set("x-bootstrap-secret", "bootstrap-test-secret")
      .send(bootstrapPayload("root@example.com", "8123456789", "user"));

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.body.admin.role).toBe("super-admin");
    expect(firstResponse.body.admin.HasAdminAccess).toBe(true);
    expect(firstResponse.body.admin.password).toBeUndefined();

    const secondResponse = await request(app)
      .post("/api/users/bootstrap/super-admin")
      .set("x-bootstrap-secret", "bootstrap-test-secret")
      .send(bootstrapPayload("second@example.com", "8123456790"));

    expect(secondResponse.status).toBe(409);
    expect(await User.countDocuments({ role: "super-admin" })).toBe(1);
  });

  test("bootstrap rejects requests when a Super Admin already exists", async () => {
    await createUser();

    const response = await request(app)
      .post("/api/users/bootstrap/super-admin")
      .set("x-bootstrap-secret", "bootstrap-test-secret")
      .send(bootstrapPayload("second@example.com", "8123456790"));

    expect(response.status).toBe(409);
    expect(await User.countDocuments({ role: "super-admin" })).toBe(1);
  });

  test("bootstrap requires its secret and cannot assign arbitrary roles", async () => {
    const deniedResponse = await request(app)
      .post("/api/users/bootstrap/super-admin")
      .set("x-bootstrap-secret", "incorrect-secret")
      .send(bootstrapPayload("root@example.com", "8123456789"));
    expect(deniedResponse.status).toBe(403);

    const response = await request(app)
      .post("/api/users/bootstrap/super-admin")
      .set("x-bootstrap-secret", "bootstrap-test-secret")
      .send(
        bootstrapPayload("root@example.com", "8123456789", "inventory-manager"),
      );

    expect(response.status).toBe(201);
    expect(response.body.admin.role).toBe("super-admin");
    expect(await User.countDocuments({ role: "inventory-manager" })).toBe(0);
  });

  test("concurrent bootstrap requests can create only one Super Admin", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/api/users/bootstrap/super-admin")
        .set("x-bootstrap-secret", "bootstrap-test-secret")
        .send(bootstrapPayload("root-one@example.com", "8123456789")),
      request(app)
        .post("/api/users/bootstrap/super-admin")
        .set("x-bootstrap-secret", "bootstrap-test-secret")
        .send(bootstrapPayload("root-two@example.com", "8123456790")),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await User.countDocuments({ role: "super-admin" })).toBe(1);
  });

  test("unknown reset email is rejected without sending an OTP", async () => {
    const response = await request(app)
      .post("/api/users/password/forgot")
      .send({ email: "unknown@example.com" });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(
      /not associated with a recognized user/i,
    );
    expect(sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  test.each([
    ["user", "reset-user@example.com", "+2348111111111"],
    ["super-admin", "reset-admin@example.com", "+2348222222222"],
    ["inventory-manager", "reset-manager@example.com", "+2348333333333"],
  ])("forgot-password works for %s accounts", async (role, email, phone) => {
    await createUser({
      role,
      email,
      phone,
      mustChangePassword: role === "inventory-manager",
      temporaryPasswordExpiresAt:
        role === "inventory-manager" ? new Date(Date.now() - 1000) : null,
    });

    const requestResponse = await request(app)
      .post("/api/users/password/forgot")
      .send({ email });
    expect(requestResponse.status).toBe(200);
    expect(sendPasswordResetOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email }),
    );

    const otp = sendPasswordResetOtp.mock.calls[0][0].otp;
    expect(otp).toMatch(/^\d{6}$/);
    const pendingUser = await User.findOne({ email }).select(
      "+passwordResetOtpHash +passwordResetOtpExpiresAt",
    );
    expect(pendingUser.passwordResetOtpHash).not.toBe(otp);
    expect(pendingUser.passwordResetOtpExpiresAt.getTime()).toBeGreaterThan(
      Date.now(),
    );

    const verifyResponse = await request(app)
      .post("/api/users/password/verify-otp")
      .send({ email, otp });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.resetToken).toBeTruthy();

    const reusedOtpResponse = await request(app)
      .post("/api/users/password/verify-otp")
      .send({ email, otp });
    expect(reusedOtpResponse.status).toBe(400);

    const resetResponse = await request(app)
      .post("/api/users/password/reset")
      .send({
        email,
        resetToken: verifyResponse.body.resetToken,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      });
    expect(resetResponse.status).toBe(200);

    const updatedUser = await User.findOne({ email }).select(
      "+passwordResetOtpHash +passwordResetTokenHash",
    );
    expect(updatedUser.mustChangePassword).toBe(false);
    expect(updatedUser.passwordResetOtpHash).toBeUndefined();
    expect(updatedUser.passwordResetTokenHash).toBeUndefined();
    expect(updatedUser.temporaryPasswordExpiresAt).toBeNull();
    await expect(
      bcrypt.compare(replacementPassword, updatedUser.password),
    ).resolves.toBe(true);

    const reusedTokenResponse = await request(app)
      .post("/api/users/password/reset")
      .send({
        email,
        resetToken: verifyResponse.body.resetToken,
        newPassword: "AnotherPassword3!",
        confirmPassword: "AnotherPassword3!",
      });
    expect(reusedTokenResponse.status).toBe(400);

    const oldPasswordLogin = await request(app)
      .post("/api/users/login")
      .send({ email, password: userPassword });
    const newPasswordLogin = await request(app)
      .post("/api/users/login")
      .send({ email, password: replacementPassword });
    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);
  });

  test("invalid and expired reset OTPs are rejected", async () => {
    await createUser({ role: "user", email: "otp@example.com" });
    await request(app)
      .post("/api/users/password/forgot")
      .send({ email: "otp@example.com" });

    const issuedOtp = sendPasswordResetOtp.mock.calls[0][0].otp;
    const wrongOtp = issuedOtp === "000000" ? "000001" : "000000";
    const invalidResponse = await request(app)
      .post("/api/users/password/verify-otp")
      .send({ email: "otp@example.com", otp: wrongOtp });
    expect(invalidResponse.status).toBe(400);

    const attemptedUser = await User.findOne({
      email: "otp@example.com",
    }).select("+passwordResetOtpAttempts");
    expect(attemptedUser.passwordResetOtpAttempts).toBe(1);

    await User.updateOne(
      { email: "otp@example.com" },
      { $set: { passwordResetOtpExpiresAt: new Date(Date.now() - 1000) } },
    );
    const expiredResponse = await request(app)
      .post("/api/users/password/verify-otp")
      .send({ email: "otp@example.com", otp: issuedOtp });
    expect(expiredResponse.status).toBe(400);
  });

  test("reset requires matching passwords and an unexpired single-use token", async () => {
    await createUser({ role: "user", email: "reset-token@example.com" });
    await request(app)
      .post("/api/users/password/forgot")
      .send({ email: "reset-token@example.com" });
    const otp = sendPasswordResetOtp.mock.calls[0][0].otp;
    const verification = await request(app)
      .post("/api/users/password/verify-otp")
      .send({ email: "reset-token@example.com", otp });
    const { resetToken } = verification.body;

    const mismatchResponse = await request(app)
      .post("/api/users/password/reset")
      .send({
        email: "reset-token@example.com",
        resetToken,
        newPassword: replacementPassword,
        confirmPassword: "DifferentPassword3!",
      });
    expect(mismatchResponse.status).toBe(400);

    await User.updateOne(
      { email: "reset-token@example.com" },
      { $set: { passwordResetTokenExpiresAt: new Date(Date.now() - 1000) } },
    );
    const expiredResponse = await request(app)
      .post("/api/users/password/reset")
      .send({
        email: "reset-token@example.com",
        resetToken,
        newPassword: replacementPassword,
        confirmPassword: replacementPassword,
      });
    expect(expiredResponse.status).toBe(400);
  });

  test("product creation persists product data and uploaded image URL", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${createToken("inventory-manager")}`)
      .set("x-test-image-upload", "true")
      .send(productFields);

    expect(response.status).toBe(201);
    expect(response.body.product.image).toBe(
      "https://example.test/products/test-image.jpg",
    );
    const savedProduct = await Product.findById(response.body.product._id);
    expect(savedProduct.toObject()).toMatchObject(productFields);
  });

  test("product update and delete persist in MongoDB", async () => {
    const product = await Product.create({
      ...productFields,
      image: "https://example.test/products/original.jpg",
    });
    const authorization = `Bearer ${createToken("super-admin")}`;

    const updateResponse = await request(app)
      .put(`/api/products/${product.id}`)
      .set("Authorization", authorization)
      .send({ name: "Updated Test Water", quantity: 10 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.product.name).toBe("Updated Test Water");
    expect((await Product.findById(product.id)).quantity).toBe(10);

    const deleteResponse = await request(app)
      .delete(`/api/products/${product.id}`)
      .set("Authorization", authorization);

    expect(deleteResponse.status).toBe(200);
    expect(await Product.findById(product.id)).toBeNull();
  });
});
