import Admin from "../../../models/Admin.js";
import Client from "../../../models/Client.js";
import Member from "../../../models/Member.js";

async function requireRoleAccount(request, fastify, { role, Model, forbiddenMessage, unauthorizedMessage, isAllowed }) {
  await fastify.authenticate(request);

  if (request.user.role !== role) {
    throw fastify.httpErrors.forbidden(forbiddenMessage);
  }

  const account = await Model.findById(request.user.sub);

  if (!account || !isAllowed(account)) {
    throw fastify.httpErrors.unauthorized(unauthorizedMessage);
  }

  return account;
}

export function requireAdmin(request, fastify) {
  return requireRoleAccount(request, fastify, {
    role: "admin",
    Model: Admin,
    forbiddenMessage: "Admin access required",
    unauthorizedMessage: "Active admin account is required",
    isAllowed: (admin) => admin.status === "active",
  });
}

export function requireMember(request, fastify) {
  return requireRoleAccount(request, fastify, {
    role: "member",
    Model: Member,
    forbiddenMessage: "Member access required",
    unauthorizedMessage: "Active member account is required",
    isAllowed: (member) => member.status === "active" && Boolean(member.ownerAdmin),
  });
}

export function requireClient(request, fastify) {
  return requireRoleAccount(request, fastify, {
    role: "client",
    Model: Client,
    forbiddenMessage: "Client access required",
    unauthorizedMessage: "Active client account is required",
    isAllowed: (client) => client.status === "active" && Boolean(client.ownerAdmin),
  });
}
