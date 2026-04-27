import Client from "../../models/Client.js";
import Member from "../../models/Member.js";
import { sendClientOtp } from "../mail/mail.service.js";
import { compareSecret, hashSecret } from "../../utils/password.js";
import { createNumericOtp, createSessionToken } from "../../utils/tokens.js";

async function issueClientOtp(fastify, client) {
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

async function clientAuthRoutes(fastify) {
  fastify.post("/auth/client/register", async (request, reply) => {
    const { name, email, password } = request.body || {};

    if (!name || !email || !password) {
      throw fastify.httpErrors.badRequest("name, email, and password are required");
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      throw fastify.httpErrors.conflict("Client email already exists");
    }

    const client = await Client.create({
      name,
      email,
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
  });

  fastify.post("/auth/client/request-otp", async (request) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      throw fastify.httpErrors.badRequest("email and password are required");
    }

    const client = await Client.findOne({ email });
    if (!client || client.status !== "active" || !(await compareSecret(password, client.passwordHash))) {
      throw fastify.httpErrors.unauthorized("Invalid client credentials");
    }

    return issueClientOtp(fastify, client);
  });

  fastify.post("/auth/login", async (request) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      throw fastify.httpErrors.badRequest("email and password are required");
    }

    const [member, client] = await Promise.all([Member.findOne({ email }), Client.findOne({ email })]);
    const memberIsValid =
      member && member.status === "active" && member.passwordHash && (await compareSecret(password, member.passwordHash));
    const clientIsValid =
      client && client.status === "active" && client.passwordHash && (await compareSecret(password, client.passwordHash));

    if (memberIsValid && clientIsValid) {
      throw fastify.httpErrors.conflict("Email is assigned to both member and client accounts. Contact admin.");
    }

    if (memberIsValid) {
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
    }

    if (clientIsValid) {
      return issueClientOtp(fastify, client);
    }

    throw fastify.httpErrors.unauthorized("Invalid login credentials");
  });

  fastify.post("/auth/client/login", async (request) => {
    const { email, password, otp } = request.body || {};

    if (!email || !password || !otp) {
      throw fastify.httpErrors.badRequest("email, password, and otp are required");
    }

    const client = await Client.findOne({ email });
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

    return {
      token: createSessionToken({ sub: client.id, role: "client" }),
      role: "client",
      redirectTo: "/client/dashboard",
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
    };
  });

  fastify.post("/auth/client/set-password", async (request) => {
    const { token, password } = request.body || {};

    if (!token || !password) {
      throw fastify.httpErrors.badRequest("token and password are required");
    }

    const clients = await Client.find({
      passwordSetTokenExpiresAt: { $gt: new Date() },
      status: "invited",
    });

    const client = await clients.reduce(async (matchedPromise, currentClient) => {
      const matched = await matchedPromise;
      if (matched) {
        return matched;
      }

      return (await compareSecret(token, currentClient.passwordSetTokenHash)) ? currentClient : null;
    }, Promise.resolve(null));

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
  });
}

export default clientAuthRoutes;
