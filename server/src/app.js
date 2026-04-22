import Fastify from "fastify";
import cors from "@fastify/cors";
import sensiblePlugin from "./plugins/sensible.js";
import rootRoutes from "./routes/root.js";
import healthRoutes from "./routes/health.js";

async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(sensiblePlugin);
  await app.register(rootRoutes);
  await app.register(healthRoutes);

  return app;
}

export default buildApp;
