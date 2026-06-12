import Admin from "../../models/Admin.js";
import Client from "../../models/Client.js";
import Member from "../../models/Member.js";
import env from "../../config/env.js";
import { assertEmailAvailable, buildDisplayNameFromEmail, normalizeEmail } from "../../utils/identity.js";
import { compareSecret, hashSecret } from "../../utils/password.js";
import { createNumericOtp, createSecureToken } from "../../utils/tokens.js";
import { sendAdminPasswordReset, sendAdminPasswordSetup, sendClientOtp, sendMemberPasswordReset, sendMemberPasswordSetup } from "../mail/mail.service.js";
import { findAccountByPasswordSetupToken } from "../shared/auth/password-token.service.js";
import { buildSessionResponse } from "../shared/auth/session-response.service.js";

function createPasswordTokenExpiry(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function createAuthService(fastify) {
  async function issueClientOtp(client) {
    const otp = createNumericOtp();

    client.otp = {
      codeHash: await hashSecret(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifiedAt: null,
    };

    await client.save();
    await sendClientOtp(fastify, client, otp);

    return {
      requiresOtp: true,
      role: "client",
      message: "OTP sent to the client email",
    };
  }

  return {
    async adminGetStarted(body, reply) {
      const normalizedEmail = normalizeEmail(body?.email);

      if (!normalizedEmail) {
        throw fastify.httpErrors.badRequest("email is required");
      }

      const existingAdmin = await Admin.findOne({ email: normalizedEmail });

      if (existingAdmin) {
        if (existingAdmin.status === "active") {
          return {
            message: "Admin account already active. Please login.",
          };
        }

        const setupToken = createSecureToken();
        existingAdmin.passwordSetTokenHash = await hashSecret(setupToken);
        existingAdmin.passwordSetTokenExpiresAt = createPasswordTokenExpiry(24);
        existingAdmin.invitedAt = new Date();
        await existingAdmin.save();
        await sendAdminPasswordSetup(fastify, existingAdmin, setupToken);

        return {
          message: "Password setup email sent",
        };
      }

      await assertEmailAvailable(normalizedEmail, fastify);

      const setupToken = createSecureToken();
      const admin = await Admin.create({
        name: buildDisplayNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        passwordSetTokenHash: await hashSecret(setupToken),
        passwordSetTokenExpiresAt: createPasswordTokenExpiry(24),
        invitedAt: new Date(),
        status: "invited",
      });

      await sendAdminPasswordSetup(fastify, admin, setupToken);

      reply.code(201);
      return {
        message: "Password setup email sent",
      };
    },

    async adminLogin(body) {
      const normalizedEmail = normalizeEmail(body?.email);
      const { password } = body || {};

      if (!normalizedEmail || !password) {
        throw fastify.httpErrors.badRequest("email and password are required");
      }

      const admin = await Admin.findOne({ email: normalizedEmail });

      if (!admin || admin.status !== "active" || !(await compareSecret(password, admin.passwordHash))) {
        throw fastify.httpErrors.unauthorized("Invalid admin credentials");
      }

      return buildSessionResponse({
        account: admin,
        role: "admin",
        redirectTo: "/",
        appUrl: env.adminUrl,
        displayName: admin.name || admin.email,
      });
    },

    async adminForgotPassword(body) {
      const normalizedEmail = normalizeEmail(body?.email);

      if (!normalizedEmail) {
        throw fastify.httpErrors.badRequest("email is required");
      }

      const admin = await Admin.findOne({ email: normalizedEmail });

      if (admin && admin.status === "active") {
        const resetToken = createSecureToken();
        admin.passwordSetTokenHash = await hashSecret(resetToken);
        admin.passwordSetTokenExpiresAt = createPasswordTokenExpiry(1);
        await admin.save();
        await sendAdminPasswordReset(fastify, admin, resetToken);
      }

      return {
        message: "If that admin account exists, a reset link has been sent.",
      };
    },

    async adminSetPassword(body) {
      const { token, password } = body || {};

      if (!token || !password) {
        throw fastify.httpErrors.badRequest("token and password are required");
      }

      const admins = await Admin.find({
        passwordSetTokenExpiresAt: { $gt: new Date() },
        status: { $in: ["invited", "active"] },
      });

      const admin = await findAccountByPasswordSetupToken(admins, token);

      if (!admin) {
        throw fastify.httpErrors.unauthorized("Invalid or expired password setup link");
      }

      admin.passwordHash = await hashSecret(password);
      admin.passwordSetTokenHash = undefined;
      admin.passwordSetTokenExpiresAt = undefined;
      admin.passwordSetAt = new Date();
      admin.status = "active";
      await admin.save();

      return {
        message: "Admin password set successfully",
        redirectTo: "/login",
      };
    },

    async memberLogin(body) {
      const normalizedEmail = normalizeEmail(body?.email);
      const { password } = body || {};

      if (!normalizedEmail || !password) {
        throw fastify.httpErrors.badRequest("email and password are required");
      }

      const member = await Member.findOne({ email: normalizedEmail });

      if (!member || member.status !== "active" || !(await compareSecret(password, member.passwordHash))) {
        throw fastify.httpErrors.unauthorized("Invalid member credentials");
      }

      return buildSessionResponse({
        account: member,
        role: "member",
        redirectTo: "/member/dashboard",
        displayName: member.name,
      });
    },

    async memberForgotPassword(body) {
      const normalizedEmail = normalizeEmail(body?.email);

      if (!normalizedEmail) {
        throw fastify.httpErrors.badRequest("email is required");
      }

      const member = await Member.findOne({ email: normalizedEmail });

      if (member && member.status === "active") {
        const resetToken = createSecureToken();
        member.passwordSetTokenHash = await hashSecret(resetToken);
        member.passwordSetTokenExpiresAt = createPasswordTokenExpiry(1);
        await member.save();
        await sendMemberPasswordReset(fastify, member, resetToken);
      }

      return {
        message: "If that member account exists, a reset link has been sent.",
      };
    },

    async memberSetPassword(body) {
      const { token, password } = body || {};

      if (!token || !password) {
        throw fastify.httpErrors.badRequest("token and password are required");
      }

      const members = await Member.find({
        passwordSetTokenExpiresAt: { $gt: new Date() },
        status: { $in: ["invited", "active"] },
      });

      const member = await findAccountByPasswordSetupToken(members, token);

      if (!member) {
        throw fastify.httpErrors.unauthorized("Invalid or expired password setup link");
      }

      member.passwordHash = await hashSecret(password);
      member.passwordSetTokenHash = undefined;
      member.passwordSetTokenExpiresAt = undefined;
      member.passwordSetAt = new Date();
      member.status = "active";
      await member.save();

      return {
        message: "Password set successfully",
        redirectTo: "/member/login",
      };
    },

    async clientRegister(body, reply) {
      const { name, password } = body || {};
      const normalizedEmail = normalizeEmail(body?.email);

      if (!name || !normalizedEmail || !password) {
        throw fastify.httpErrors.badRequest("name, email, and password are required");
      }

      await assertEmailAvailable(normalizedEmail, fastify);

      const client = await Client.create({
        name,
        email: normalizedEmail,
        passwordHash: await hashSecret(password),
        passwordSetAt: new Date(),
        status: "active",
      });

      reply.code(201);

      return {
        id: client.id,
        email: client.email,
        role: "client",
      };
    },

    async clientRequestOtp(body) {
      const normalizedEmail = normalizeEmail(body?.email);
      const { password } = body || {};

      if (!normalizedEmail || !password) {
        throw fastify.httpErrors.badRequest("email and password are required");
      }

      const client = await Client.findOne({ email: normalizedEmail });

      if (!client || client.status !== "active" || !(await compareSecret(password, client.passwordHash))) {
        throw fastify.httpErrors.unauthorized("Invalid client credentials");
      }

      return issueClientOtp(client);
    },

    async login(body) {
      const normalizedEmail = normalizeEmail(body?.email);
      const { password } = body || {};

      if (!normalizedEmail || !password) {
        throw fastify.httpErrors.badRequest("email and password are required");
      }

      const [admin, member, client] = await Promise.all([
        Admin.findOne({ email: normalizedEmail }),
        Member.findOne({ email: normalizedEmail }),
        Client.findOne({ email: normalizedEmail }),
      ]);

      const adminIsValid =
        admin && admin.status === "active" && admin.passwordHash && (await compareSecret(password, admin.passwordHash));
      const memberIsValid =
        member && member.status === "active" && member.passwordHash && (await compareSecret(password, member.passwordHash));
      const clientIsValid =
        client && client.status === "active" && client.passwordHash && (await compareSecret(password, client.passwordHash));

      const validRoles = [adminIsValid, memberIsValid, clientIsValid].filter(Boolean).length;

      if (validRoles > 1) {
        throw fastify.httpErrors.conflict("Email is assigned to multiple account types. Contact support.");
      }

      if (adminIsValid) {
        return buildSessionResponse({
          account: admin,
          role: "admin",
          redirectTo: "/",
          appUrl: env.adminUrl,
          displayName: admin.name || admin.email,
        });
      }

      if (memberIsValid) {
        return buildSessionResponse({
          account: member,
          role: "member",
          redirectTo: "/member/dashboard",
          appUrl: env.clientUrl,
          displayName: member.name,
        });
      }

      if (clientIsValid) {
        return issueClientOtp(client);
      }

      throw fastify.httpErrors.unauthorized("Invalid login credentials");
    },

    async clientLogin(body) {
      const normalizedEmail = normalizeEmail(body?.email);
      const { password, otp } = body || {};

      if (!normalizedEmail || !password || !otp) {
        throw fastify.httpErrors.badRequest("email, password, and otp are required");
      }

      const client = await Client.findOne({ email: normalizedEmail });
      const otpIsExpired = !client?.otp?.expiresAt || client.otp.expiresAt.getTime() < Date.now();

      if (
        !client ||
        client.status !== "active" ||
        !(await compareSecret(password, client.passwordHash)) ||
        otpIsExpired ||
        !(await compareSecret(otp, client.otp.codeHash))
      ) {
        throw fastify.httpErrors.unauthorized("Invalid client login or OTP");
      }

      client.otp.verifiedAt = new Date();
      client.otp.codeHash = undefined;
      client.otp.expiresAt = undefined;
      await client.save();

      return buildSessionResponse({
        account: client,
        role: "client",
        redirectTo: "/client/dashboard",
        appUrl: env.clientUrl,
        displayName: client.name,
      });
    },

    async clientSetPassword(body) {
      const { token, password } = body || {};

      if (!token || !password) {
        throw fastify.httpErrors.badRequest("token and password are required");
      }

      const clients = await Client.find({
        passwordSetTokenExpiresAt: { $gt: new Date() },
        status: "invited",
      });

      const client = await findAccountByPasswordSetupToken(clients, token);

      if (!client) {
        throw fastify.httpErrors.unauthorized("Invalid or expired password setup link");
      }

      client.passwordHash = await hashSecret(password);
      client.passwordSetTokenHash = undefined;
      client.passwordSetTokenExpiresAt = undefined;
      client.passwordSetAt = new Date();
      client.status = "active";
      await client.save();

      return {
        message: "Client password set successfully",
        redirectTo: "/client/login",
      };
    },
  };
}
