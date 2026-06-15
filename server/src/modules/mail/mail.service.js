import { Resend } from "resend";
import env from "../../config/env.js";

let resendClient = null;

function buildMemberTicketUrl(ticketId) {
  return `${env.clientUrl.replace(/\/+$/, "")}/member/tickets/${ticketId}`;
}

function createMailError(message, statusCode = 503, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function getResendClient() {
  if (!env.resend.apiKey) {
    throw createMailError("Mail delivery is unavailable: RESEND_API_KEY is not configured", 503, {
      provider: "resend",
      reason: "missing_api_key",
    });
  }

  if (!resendClient) {
    resendClient = new Resend(env.resend.apiKey);
  }

  return resendClient;
}

function validateMailMessage(message) {
  const to = Array.isArray(message?.to) ? message.to.filter(Boolean) : [message?.to].filter(Boolean);
  const subject = String(message?.subject || "").trim();
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  const html = typeof message?.html === "string" ? message.html.trim() : "";

  if (!to.length) {
    throw createMailError("Mail delivery is unavailable: recipient email is required", 500, {
      provider: "resend",
      reason: "missing_recipient",
    });
  }

  if (!subject) {
    throw createMailError("Mail delivery is unavailable: subject is required", 500, {
      provider: "resend",
      reason: "missing_subject",
    });
  }

  if (!text && !html) {
    throw createMailError("Mail delivery is unavailable: text or html body is required", 500, {
      provider: "resend",
      reason: "missing_body",
    });
  }

  if (!env.resend.from) {
    throw createMailError("Mail delivery is unavailable: RESEND_FROM is not configured", 503, {
      provider: "resend",
      reason: "missing_from_address",
    });
  }

  return {
    ...message,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  };
}

async function sendMail(app, message) {
  const resend = getResendClient();
  const payload = validateMailMessage(message);

  app.log.info(
    {
      provider: "resend",
      to: payload.to,
      subject: payload.subject,
      from: env.resend.from,
    },
    "Attempting mail delivery",
  );

  try {
    const { data, error } = await resend.emails.send({
      from: env.resend.from,
      ...payload,
    });

    if (error) {
      app.log.error(
        {
          provider: "resend",
          to: payload.to,
          subject: payload.subject,
          from: env.resend.from,
          resendError: error,
        },
        "Mail delivery failed",
      );

      throw createMailError(error.message || "Failed to send email with Resend", 502, {
        provider: "resend",
        resendError: error,
      });
    }

    app.log.info(
      {
        provider: "resend",
        to: payload.to,
        subject: payload.subject,
        from: env.resend.from,
        messageId: data?.id || null,
      },
      "Mail delivered",
    );

    return data;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    app.log.error(
      {
        provider: "resend",
        to: payload.to,
        subject: payload.subject,
        from: env.resend.from,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      },
      "Mail delivery request crashed",
    );

    throw createMailError("Mail delivery request failed", 502, {
      provider: "resend",
      cause: error.message,
    });
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

export async function sendTicketDueReminderMail(app, member, ticket, project) {
  const ticketUrl = buildMemberTicketUrl(ticket._id);
  const deadline = new Date(ticket.deadline).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  await sendMail(app, {
    to: member.email,
    subject: `Reminder: ticket due soon - ${ticket.title}`,
    text: `Hello ${member.name}, this is a reminder that "${ticket.title}" in ${project.name} is due by ${deadline}. Current status: ${ticket.status}. Open ticket: ${ticketUrl}`,
    html: `<p>Hello ${member.name},</p><p>This is a reminder that <strong>${ticket.title}</strong> in <strong>${project.name}</strong> is due by ${deadline}.</p><p>Current status: ${ticket.status}</p><p><a href="${ticketUrl}">Open ticket</a></p>`,
  });
}
