const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendStaffCredentials = async ({
  email,
  name,
  password,
  role = "inventory-manager",
}) => {
  const templatePath = path.join(
    __dirname,
    "emailTemplates",
    "staffAccountCreated.html",
  );

  let html = fs.readFileSync(templatePath, "utf8");

  const loginUrl =
    process.env.FRONTEND_URL || "http://localhost:3000";

  const roleNames = {
  "inventory-manager":
    "Inventory Manager",

  "super-admin":
    "Super Admin",
};

const roleName =
  roleNames[role] ||
  role;

  html = html
    .replaceAll("{{FULL_NAME}}", name)
    .replaceAll("{{EMAIL}}", email)
    .replaceAll("{{USERNAME}}", email)
    .replaceAll("{{TEMPORARY_PASSWORD}}", password)
    .replaceAll("{{ROLE}}", roleName)
    .replaceAll("{{LOGIN_URL}}", loginUrl)
    .replaceAll(
      "{{CURRENT_YEAR}}",
      new Date().getFullYear().toString(),
    );

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject:  "Your Nestlé ERP Staff Account",
    html,
  });
};

const sendPasswordReset = async ({
  email,
  name,
  resetUrl,
}) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Reset your Nestlé ERP password",

    html: `
      <!doctype html>
      <html>
        <body style="font-family:Arial,sans-serif;background:#f5f7f6;padding:32px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;padding:32px;border-radius:10px;">
            <h2 style="color:#174b34;">Reset your password</h2>

            <p>Hello ${name},</p>

            <p>
              A password reset was requested for your Nestlé ERP
              administrative account.
            </p>

            <p>
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:12px 20px;
                  background:#174b34;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:6px;
                "
              >
                Reset password
              </a>
            </p>

            <p>
              This link expires in 20 minutes.
            </p>

            <p>
              If you did not request this password reset,
              you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
};

module.exports = {
  sendStaffCredentials,
  sendPasswordReset,
};