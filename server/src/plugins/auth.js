import jwt from "jsonwebtoken";
import env from "../config/env.js";

async function authPlugin(fastify) {
  fastify.decorate("authenticate", async (request) => {
    const header = request.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      throw fastify.httpErrors.unauthorized("Authentication token is required");
    }

    try {
      request.user = jwt.verify(token, env.jwtSecret);
    } catch (error) {
      throw fastify.httpErrors.unauthorized("Invalid authentication token");
    }
  });
}

export default authPlugin;
