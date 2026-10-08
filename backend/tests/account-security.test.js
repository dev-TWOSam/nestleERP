const bcrypt = require("bcrypt");
const User = require("../src/models/users");
const BootstrapState = require("../src/models/bootstrapState");
const emailService = require("../src/utils/sendEmail");
const accountSecurity = require("../src/services/accountSecurity");

const strongPassword = "StrongPass1!";
const newPassword = "BetterPass2!";

describe("account security workflows", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN = "one-time-bootstrap-test-token";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("changes a temporary password and clears the first-login requirement", async () => {
    const user = {
      password: await bcrypt.hash(strongPassword, 4),
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
      save: jest.fn().mockResolvedValue(),
    };
    jest.spyOn(User, "findOne").mockResolvedValue(user);

    await expect(
      accountSecurity.changePassword({
        email: "staff@example.com",
        currentPassword: strongPassword,
        newPassword,
        confirmPassword: newPassword,
      }),
    ).resolves.toEqual({ message: "Password changed successfully" });

    expect(user.mustChangePassword).toBe(false);
    expect(user.temporaryPasswordExpiresAt).toBeNull();
    expect(await bcrypt.compare(newPassword, user.password)).toBe(true);
    expect(await bcrypt.compare(strongPassword, user.password)).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  test("rejects an incorrect current password and a mismatched confirmation", async () => {
    const user = {
      password: await bcrypt.hash(strongPassword, 4),
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
    };
    jest.spyOn(User, "findOne").mockResolvedValue(user);

    await expect(
      accountSecurity.changePassword({
        email: "staff@example.com",
        currentPassword: "WrongPass1!",
        newPassword,
        confirmPassword: newPassword,
      }),
    ).rejects.toMatchObject({ status: 401 });

    await expect(
      accountSecurity.changePassword({
        email: "staff@example.com",
        currentPassword: strongPassword,
        newPassword,
        confirmPassword: "DifferentPass3!",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test("rejects an expired temporary password", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({
      password: await bcrypt.hash(strongPassword, 4),
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() - 1),
    });

    await expect(
      accountSecurity.changePassword({
        email: "staff@example.com",
        currentPassword: strongPassword,
        newPassword,
        confirmPassword: newPassword,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  test.each(["user", "super-admin", "inventory-manager"])(
    "sends a hashed six-digit reset OTP for a %s account",
    async (role) => {
      const user = {
        _id: `id-${role}`,
        role,
        passwordResetOtpSentAt: null,
      };
      const select = jest.fn().mockResolvedValue(user);
      jest.spyOn(User, "findOne").mockReturnValue({ select });
      const updateOne = jest.spyOn(User, "updateOne").mockResolvedValue({});
      let sentOtp;
      jest
        .spyOn(emailService, "sendPasswordResetOtp")
        .mockImplementation(async ({ otp }) => {
          sentOtp = otp;
        });

      await expect(
        accountSecurity.requestPasswordReset({ email: "person@example.com" }),
      ).resolves.toEqual({
        message: "Password reset code sent to the registered email address",
      });

      expect(sentOtp).toMatch(/^\d{6}$/);
      const update = updateOne.mock.calls[0][1].$set;
      expect(update.passwordResetOtpHash).not.toBe(sentOtp);
      expect(update.passwordResetOtpExpiresAt.getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(update.passwordResetOtpAttempts).toBe(0);
      expect(emailService.sendPasswordResetOtp).toHaveBeenCalledWith({
        email: "person@example.com",
        otp: sentOtp,
      });
    },
  );

  test("does not send a reset OTP for an unregistered email", async () => {
    jest
      .spyOn(User, "findOne")
      .mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const sendOtp = jest.spyOn(emailService, "sendPasswordResetOtp");

    await expect(
      accountSecurity.requestPasswordReset({ email: "unknown@example.com" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(sendOtp).not.toHaveBeenCalled();
  });

  test("verifies an OTP once and returns a short-lived reset token", async () => {
    const findOneAndUpdate = jest
      .spyOn(User, "findOneAndUpdate")
      .mockResolvedValueOnce({ _id: "user-id" })
      .mockResolvedValueOnce(null);
    jest.spyOn(User, "updateOne").mockResolvedValue({});

    const result = await accountSecurity.verifyPasswordResetOtp({
      email: "person@example.com",
      otp: "001234",
    });

    expect(result.resetToken).toMatch(/^[a-f\d]{64}$/);
    expect(result.expiresInSeconds).toBe(600);
    const [query, update] = findOneAndUpdate.mock.calls[0];
    expect(query.passwordResetOtpHash).not.toBe("001234");
    expect(query.passwordResetOtpExpiresAt.$gt).toBeInstanceOf(Date);
    expect(update.$set.passwordResetOtpHash).toBeNull();
    expect(update.$set.passwordResetTokenHash).not.toBe(result.resetToken);

    await expect(
      accountSecurity.verifyPasswordResetOtp({
        email: "person@example.com",
        otp: "001234",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test("rejects malformed or expired OTPs", async () => {
    const findOneAndUpdate = jest
      .spyOn(User, "findOneAndUpdate")
      .mockResolvedValue(null);
    jest.spyOn(User, "updateOne").mockResolvedValue({});

    await expect(
      accountSecurity.verifyPasswordResetOtp({
        email: "person@example.com",
        otp: "12345",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(findOneAndUpdate).not.toHaveBeenCalled();

    await expect(
      accountSecurity.verifyPasswordResetOtp({
        email: "person@example.com",
        otp: "123456",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      findOneAndUpdate.mock.calls[0][0].passwordResetOtpExpiresAt.$gt,
    ).toBeInstanceOf(Date);
  });

  test("resets a password atomically and makes reset authorization single-use", async () => {
    const findOneAndUpdate = jest
      .spyOn(User, "findOneAndUpdate")
      .mockResolvedValueOnce({ _id: "user-id" })
      .mockResolvedValueOnce(null);

    await expect(
      accountSecurity.resetPassword({
        resetToken: "a".repeat(64),
        newPassword,
        confirmPassword: newPassword,
      }),
    ).resolves.toEqual({ message: "Password reset successfully" });

    const [query, update] = findOneAndUpdate.mock.calls[0];
    expect(query.passwordResetTokenHash).not.toBe("a".repeat(64));
    expect(query.passwordResetTokenExpiresAt.$gt).toBeInstanceOf(Date);
    expect(update.$set.passwordResetTokenHash).toBeNull();
    expect(update.$set.mustChangePassword).toBe(false);
    expect(await bcrypt.compare(newPassword, update.$set.password)).toBe(true);
    expect(await bcrypt.compare(strongPassword, update.$set.password)).toBe(
      false,
    );

    await expect(
      accountSecurity.resetPassword({
        resetToken: "a".repeat(64),
        newPassword,
        confirmPassword: newPassword,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test("rejects password reset when confirmation does not match", async () => {
    const findOneAndUpdate = jest.spyOn(User, "findOneAndUpdate");
    await expect(
      accountSecurity.resetPassword({
        resetToken: "a".repeat(64),
        newPassword,
        confirmPassword: "AnotherPass3!",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("bootstraps only the first Super Admin and ignores a client-supplied role", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest
      .spyOn(BootstrapState, "findOneAndUpdate")
      .mockResolvedValue({ _id: "first-super-admin", completed: false });
    jest.spyOn(BootstrapState, "updateOne").mockResolvedValue({});
    jest
      .spyOn(User.prototype, "save")
      .mockImplementation(function saveAccount() {
        return Promise.resolve(this);
      });

    const account = await accountSecurity.bootstrapSuperAdmin({
      firstName: "Root",
      lastName: "Admin",
      email: "root@example.com",
      password: strongPassword,
      role: "inventory-manager",
      bootstrapToken: process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN,
    });

    expect(account.role).toBe("super-admin");
    expect(account.HasAdminAccess).toBe(true);
    expect(account.mustChangePassword).toBe(false);
    expect(await bcrypt.compare(strongPassword, account.password)).toBe(true);
    expect(BootstrapState.updateOne).toHaveBeenCalledWith(
      { _id: "first-super-admin" },
      { $set: { completed: true, lockExpiresAt: null } },
    );
  });

  test("rejects bootstrap when a Super Admin already exists", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({ role: "super-admin" });
    const claim = jest.spyOn(BootstrapState, "findOneAndUpdate");
    jest.spyOn(BootstrapState, "updateOne").mockResolvedValue({});

    await expect(
      accountSecurity.bootstrapSuperAdmin({
        firstName: "Second",
        lastName: "Admin",
        email: "second@example.com",
        password: strongPassword,
        bootstrapToken: process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(claim).not.toHaveBeenCalled();
  });

  test("rejects a concurrent or already-claimed bootstrap request", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    const duplicateKeyError = Object.assign(new Error("duplicate key"), {
      code: 11000,
    });
    jest
      .spyOn(BootstrapState, "findOneAndUpdate")
      .mockRejectedValue(duplicateKeyError);

    await expect(
      accountSecurity.bootstrapSuperAdmin({
        firstName: "Root",
        lastName: "Admin",
        email: "root@example.com",
        password: strongPassword,
        bootstrapToken: process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
