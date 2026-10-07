const mockSendMail = jest.fn().mockResolvedValue(undefined);

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const originalSmtpUser = process.env.SMTP_USER;
process.env.SMTP_USER = "test@example.com";

const {
  sendPasswordResetOtp,
  sendStaffCredentials,
} = require("../src/utils/sendEmail");

afterAll(() => {
  if (originalSmtpUser === undefined) {
    delete process.env.SMTP_USER;
  } else {
    process.env.SMTP_USER = originalSmtpUser;
  }
});

beforeEach(() => {
  mockSendMail.mockClear();
});

test("sends a reset OTP through the configured email transport", async () => {
  await sendPasswordResetOtp({ email: "user@example.com", otp: "012345" });

  expect(mockSendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      from: "test@example.com",
      to: "user@example.com",
      text: expect.stringContaining("012345"),
      html: expect.stringContaining("012345"),
    }),
  );
});

test("escapes user-provided values in the staff email HTML", async () => {
  await sendStaffCredentials({
    email: "staff@example.com",
    name: "<script>alert(1)</script>",
    password: "Temp&Password1!",
  });

  const message = mockSendMail.mock.calls[0][0];
  expect(message.html).toContain("&lt;script&gt;");
  expect(message.html).not.toContain("<script>");
  expect(message.text).toContain("Temp&Password1!");
});
