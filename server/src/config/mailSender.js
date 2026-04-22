import nodemailer from "nodemailer";
import env from "./env.js";

function createTransporter() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth:
      env.smtpUser && env.smtpPass
        ? {
            user: env.smtpUser,
            pass: env.smtpPass,
          }
        : undefined,
  });
}

function assertMailConfig() {
  if (!env.smtpHost || !env.smtpPort || !env.mailFrom) {
    throw new Error("SMTP_HOST, SMTP_PORT and MAIL_FROM are required");
  }
}

export async function sendMail({ to, subject, html, text }) {
  assertMailConfig();

  const transporter = createTransporter();

  return transporter.sendMail({
    from: env.mailFrom,
    to,
    subject,
    html,
    text,
  });
}

export async function sendPasswordSetupEmail({ to, clientName, setupLink }) {
  return sendMail({
    to,
    subject: "Set your OrbitDesk password",
    text: `Hello ${clientName}, use this link to set your password: ${setupLink}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Set your OrbitDesk password</h2>
        <p>Hello ${clientName},</p>
        <p>Your account has been created. Use the button below to set your password.</p>
        <p>
          <a href="${setupLink}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;">
            Set Password
          </a>
        </p>
        <p>If the button does not work, open this link:</p>
        <p>${setupLink}</p>
      </div>
    `,
  });
}

export async function sendLoginOtpEmail({ to, clientName, otp }) {
  return sendMail({
    to,
    subject: "Your OrbitDesk login OTP",
    text: `Hello ${clientName}, your OrbitDesk OTP is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>OrbitDesk login verification</h2>
        <p>Hello ${clientName},</p>
        <p>Your OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
  });
}
