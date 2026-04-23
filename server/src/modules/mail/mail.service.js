import nodemailer from "nodemailer";
import env from "../../config/env.js";

function createTransport() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

async function sendMail(app, message) {
  const transport = createTransport();

  if (!transport) {
    app.log.info({ to: message.to, subject: message.subject, text: message.text }, "Mail skipped; SMTP is not configured");
    return;
  }

  await transport.sendMail({
    from: env.smtp.from,
    ...message,
  });
}

export async function sendClientOtp(app, client, otp) {
  await sendMail(app, {
    to: client.email,
    subject: "Your OrbitDesk login OTP",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendMemberPasswordSetup(app, member, token) {
  const setupUrl = `${env.adminUrl}/set-password?token=${token}`;

  await sendMail(app, {
    to: member.email,
    subject: "Set your OrbitDesk member password",
    text: `Hello ${member.name}, set your member password here: ${setupUrl}`,
  });
}

export async function sendClientPasswordSetup(app, client, token) {
  const setupUrl = `${env.adminUrl}/set-password?role=client&token=${token}`;

  await sendMail(app, {
    to: client.email,
    subject: "Set your OrbitDesk client password",
    text: `Hello ${client.name}, set your client password here: ${setupUrl}. After that, login with email, password, and OTP.`,
  });
}

export async function sendTicketAssignedMail(app, member, ticket, project) {
  const urlsText = ticket.urls?.length ? `Links: ${ticket.urls.join(", ")}` : "Links: none";

  await sendMail(app, {
    to: member.email,
    subject: `Ticket assigned: ${ticket.title}`,
    text: `Hello ${member.name}, a ticket was assigned to you in ${project.name}. Deadline: ${new Date(ticket.deadline).toLocaleDateString("en-US")}. ${urlsText}`,
  });
}
