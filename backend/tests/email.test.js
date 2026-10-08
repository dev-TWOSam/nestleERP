describe("email utility", () => {
  test("sendStaffCredentials calls the SMTP transport with the expected payload", async () => {
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
      }),
    );
  });
});
