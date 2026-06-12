import { createAuthController } from "./auth.controller.js";

async function adminAuthRoutes(fastify) {
  const controller = createAuthController(fastify);

  fastify.post("/auth/admin/get-started", controller.adminGetStarted);
  fastify.post("/auth/admin/login", controller.adminLogin);
  fastify.post("/auth/admin/forgot-password", controller.adminForgotPassword);
  fastify.post("/auth/admin/set-password", controller.adminSetPassword);
}

export default adminAuthRoutes;
