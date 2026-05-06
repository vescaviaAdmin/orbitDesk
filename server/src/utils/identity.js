import Admin from "../models/Admin.js";
import Client from "../models/Client.js";
import Member from "../models/Member.js";

export function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

export function buildDisplayNameFromEmail(email = "") {
  const localPart = normalizeEmail(email).split("@")[0] || "admin";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function findAccountsByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  const [admin, member, client] = await Promise.all([
    Admin.findOne({ email: normalizedEmail }),
    Member.findOne({ email: normalizedEmail }),
    Client.findOne({ email: normalizedEmail }),
  ]);

  return { admin, member, client };
}

export async function assertEmailAvailable(email, fastify) {
  const { admin, member, client } = await findAccountsByEmail(email);

  if (admin || member || client) {
    throw fastify.httpErrors.conflict("Email is already in use");
  }
}
