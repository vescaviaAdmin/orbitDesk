import { createAuthController } from "./auth.controller.js";

async function memberAuthRoutes(fastify) {
  const controller = createAuthController(fastify);

  fastify.post("/auth/member/login", controller.memberLogin);
  fastify.post("/auth/member/forgot-password", controller.memberForgotPassword);
  fastify.post("/auth/member/set-password", controller.memberSetPassword);
}

export default memberAuthRoutes;
