import { Resend } from "resend";
import env from "../../config/env.js";

function buildMemberTicketUrl(ticketId) {
  return `${env.clientUrl.replace(/\/+$/, "")}/member/tickets/${ticketId}`;
}

async function sendMail(app, message) {
  if (!env.resend.apiKey) {
    app.log.info({ to: message.to, subject: message.subject, text: message.text }, "Mail skipped; Resend is not configured");
    return;
  }

  const resend = new Resend(env.resend.apiKey);

  const { error } = await resend.emails.send({
    from: env.resend.from,
    ...message,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email with Resend");
  }
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

export async function sendMemberPasswordReset(app, member, token) {
  const resetUrl = `${env.adminUrl}/set-password?token=${token}`;

  await sendMail(app, {
    to: member.email,
    subject: "Reset your OrbitDesk member password",
    text: `Hello ${member.name}, reset your member password here: ${resetUrl}`,
    html: `<p>Hello ${member.name},</p><p>Reset your OrbitDesk member password here:</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

export async function sendAdminPasswordSetup(app, admin, token) {
  const setupUrl = `${env.adminUrl}/set-password?role=admin&token=${token}`;

  await sendMail(app, {
    to: admin.email,
    subject: "Set your OrbitDesk admin password",
    text: `Hello ${admin.name || "admin"}, set your admin password here: ${setupUrl}`,
  });
}

export async function sendAdminPasswordReset(app, admin, token) {
  const resetUrl = `${env.adminUrl}/set-password?role=admin&token=${token}`;

  await sendMail(app, {
    to: admin.email,
    subject: "Reset your OrbitDesk admin password",
    text: `Hello ${admin.name || "admin"}, reset your admin password here: ${resetUrl}`,
    html: `<p>Hello ${admin.name || "admin"},</p><p>Reset your OrbitDesk admin password here:</p><p><a href="${resetUrl}">Reset password</a></p>`,
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
  const ticketUrl = buildMemberTicketUrl(ticket._id);

  await sendMail(app, {
    to: member.email,
    subject: `Ticket assigned: ${ticket.title}`,
    text: `Hello ${member.name}, a new ticket was raised and assigned to you in ${project.name}. Deadline: ${new Date(ticket.deadline).toLocaleDateString("en-US")}. ${urlsText}. Open ticket: ${ticketUrl}`,
    html: `<p>Hello ${member.name}, a new ticket was raised and assigned to you in <strong>${project.name}</strong>.</p><p>Deadline: ${new Date(ticket.deadline).toLocaleDateString("en-US")}</p><p>${urlsText}</p><p><a href="${ticketUrl}">Open ticket</a></p>`,
  });
}
