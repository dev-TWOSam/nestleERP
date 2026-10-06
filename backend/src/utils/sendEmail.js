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

module.exports = {
  sendStaffCredentials,
};