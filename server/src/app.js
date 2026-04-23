import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensiblePlugin from "./plugins/sensible.js";
import authPlugin from "./plugins/auth.js";
import connectDatabase from "./config/database.js";
import rootRoutes from "./routes/root.js";
import healthRoutes from "./routes/health.js";
import clientAuthRoutes from "./modules/auth/client.routes.js";
import memberAuthRoutes from "./modules/auth/member.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import memberProjectRoutes from "./modules/member/member-project.routes.js";

async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  await sensiblePlugin(app);
  await authPlugin(app);
  await connectDatabase(app);
  await app.register(rootRoutes);
  await app.register(healthRoutes);
  await app.register(clientAuthRoutes);
  await app.register(memberAuthRoutes);
  await app.register(adminRoutes);
  await app.register(memberProjectRoutes);

  return app;
}

export default buildApp;
