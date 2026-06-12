import { createAuthController } from "./auth.controller.js";

async function clientAuthRoutes(fastify) {
  const controller = createAuthController(fastify);

  fastify.post("/auth/client/register", controller.clientRegister);
  fastify.post("/auth/client/request-otp", controller.clientRequestOtp);
  fastify.post("/auth/login", controller.login);
  fastify.post("/auth/client/login", controller.clientLogin);
  fastify.post("/auth/client/set-password", controller.clientSetPassword);
}

export default clientAuthRoutes;
