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

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
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

  const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const roleName = role === "inventory-manager" ? "Inventory Manager" : role;

  html = html
    .replaceAll("{{FULL_NAME}}", name)
    .replaceAll("{{EMAIL}}", email)
    .replaceAll("{{USERNAME}}", email)
    .replaceAll("{{TEMPORARY_PASSWORD}}", password)
    .replaceAll("{{ROLE}}", roleName)
    .replaceAll("{{LOGIN_URL}}", loginUrl)
    .replaceAll("{{CURRENT_YEAR}}", new Date().getFullYear().toString());

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Your Nestlé ERP Staff Account",
    html,
    text: `Your Nestle ERP staff account is ready. Email: ${email}. Temporary password: ${password}. Change this password when you first sign in; it expires after 24 hours. Login: ${loginUrl}`,
  });
};

const sendPasswordResetOtp = async ({ email, otp }) => {
  const safeOtp = escapeHtml(otp);
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Your Nestle ERP password reset code",
    html: `<p>Your password reset code is <strong>${safeOtp}</strong>.</p><p>It expires in 10 minutes and can only be used once. If you did not request a reset, ignore this email.</p>`,
    text: `Your Nestle ERP password reset code is ${otp}. It expires in 10 minutes and can only be used once. If you did not request a reset, ignore this email.`,
  });
};

const sendPasswordResetOtp = async ({ email, otp }) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Your Nestle ERP password reset code",
    text: `Your password reset code is ${otp}. It expires in 10 minutes and can only be used once. If you did not request this code, you can ignore this email.`,
  });
};

module.exports = {
  sendPasswordResetOtp,
  sendStaffCredentials,
  sendPasswordResetOtp,
};
