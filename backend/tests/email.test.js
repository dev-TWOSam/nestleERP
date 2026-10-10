describe("email utility", () => {
  test("sendStaffCredentials calls the SMTP transport with the expected payload", async () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = "https://nestleerp.vercel.app";
    const sendMailMock = jest
      .fn()
      .mockResolvedValue({ accepted: ["staff@example.com"] });
    const createTransportMock = jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    });

    jest.doMock("nodemailer", () => ({
      createTransport: createTransportMock,
    }));

    const { sendStaffCredentials } = require("../src/utils/sendEmail");

    try {
      await sendStaffCredentials({
        email: "staff@example.com",
        name: "Jane Doe",
        password: "TempPass1!",
        role: "inventory-manager",
      });

      expect(createTransportMock).toHaveBeenCalled();
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "staff@example.com",
          subject: expect.stringMatching(/Nestlé ERP Staff Account/i),
          html: expect.stringContaining(
            'href="https://nestleerp.vercel.app/pages/admin-login.html"',
          ),
          text: expect.stringContaining(
            "Login: https://nestleerp.vercel.app/pages/admin-login.html",
          ),
        }),
      );
    } finally {
      if (originalFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = originalFrontendUrl;
      }
    }
  });
});
