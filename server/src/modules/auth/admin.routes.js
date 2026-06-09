import Admin from "../../models/Admin.js";
import env from "../../config/env.js";
import { sendAdminPasswordReset, sendAdminPasswordSetup } from "../mail/mail.service.js";
import { compareSecret, hashSecret } from "../../utils/password.js";
import { createSecureToken, createSessionToken } from "../../utils/tokens.js";
import { assertEmailAvailable, buildDisplayNameFromEmail, normalizeEmail } from "../../utils/identity.js";

async function adminAuthRoutes(fastify) {
  fastify.post("/auth/admin/get-started", async (request, reply) => {
    const normalizedEmail = normalizeEmail(request.body?.email);

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
      existingAdmin.passwordSetTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
      passwordSetTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      invitedAt: new Date(),
      status: "invited",
    });

    await sendAdminPasswordSetup(fastify, admin, setupToken);

    reply.code(201);
    return {
      message: "Password setup email sent",
    };
  });

  fastify.post("/auth/admin/login", async (request) => {
    const normalizedEmail = normalizeEmail(request.body?.email);
    const { password } = request.body || {};

    if (!normalizedEmail || !password) {
      throw fastify.httpErrors.badRequest("email and password are required");
    }

    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin || admin.status !== "active" || !(await compareSecret(password, admin.passwordHash))) {
      throw fastify.httpErrors.unauthorized("Invalid admin credentials");
    }

    return {
      token: createSessionToken({ sub: admin.id, role: "admin" }),
      role: "admin",
      redirectTo: "/",
      appUrl: env.adminUrl,
      user: {
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
      },
    };
  });

  fastify.post("/auth/admin/forgot-password", async (request) => {
    const normalizedEmail = normalizeEmail(request.body?.email);

    if (!normalizedEmail) {
      throw fastify.httpErrors.badRequest("email is required");
    }

    const admin = await Admin.findOne({ email: normalizedEmail });

    if (admin && admin.status === "active") {
      const resetToken = createSecureToken();
      admin.passwordSetTokenHash = await hashSecret(resetToken);
      admin.passwordSetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await admin.save();
      await sendAdminPasswordReset(fastify, admin, resetToken);
    }

    return {
      message: "If that admin account exists, a reset link has been sent.",
    };
  });

  fastify.post("/auth/admin/set-password", async (request) => {
    const { token, password } = request.body || {};

    if (!token || !password) {
      throw fastify.httpErrors.badRequest("token and password are required");
    }

    const admins = await Admin.find({
      passwordSetTokenExpiresAt: { $gt: new Date() },
      status: { $in: ["invited", "active"] },
    });

    const admin = await admins.reduce(async (matchedPromise, currentAdmin) => {
      const matched = await matchedPromise;
      if (matched) {
        return matched;
      }

      return (await compareSecret(token, currentAdmin.passwordSetTokenHash)) ? currentAdmin : null;
    }, Promise.resolve(null));

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
  });
}

export default adminAuthRoutes;
