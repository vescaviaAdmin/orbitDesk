import Member from "../../models/Member.js";
import { compareSecret, hashSecret } from "../../utils/password.js";
import { createSessionToken } from "../../utils/tokens.js";
import { normalizeEmail } from "../../utils/identity.js";

async function memberAuthRoutes(fastify) {
  fastify.post("/auth/member/login", async (request) => {
    const normalizedEmail = normalizeEmail(request.body?.email);
    const { password } = request.body || {};

    if (!normalizedEmail || !password) {
      throw fastify.httpErrors.badRequest("email and password are required");
    }

    const member = await Member.findOne({ email: normalizedEmail });
    if (!member || member.status !== "active" || !(await compareSecret(password, member.passwordHash))) {
      throw fastify.httpErrors.unauthorized("Invalid member credentials");
    }

    return {
      token: createSessionToken({ sub: member.id, role: "member" }),
      role: "member",
      redirectTo: "/member/dashboard",
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
      },
    };
  });

  fastify.post("/auth/member/set-password", async (request) => {
    const { token, password } = request.body || {};

    if (!token || !password) {
      throw fastify.httpErrors.badRequest("token and password are required");
    }

    const members = await Member.find({
      passwordSetTokenExpiresAt: { $gt: new Date() },
      status: "invited",
    });

    const member = await members.reduce(async (matchedPromise, currentMember) => {
      const matched = await matchedPromise;
      if (matched) {
        return matched;
      }

      return (await compareSecret(token, currentMember.passwordSetTokenHash)) ? currentMember : null;
    }, Promise.resolve(null));

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
  });
}

export default memberAuthRoutes;
