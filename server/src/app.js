import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import env from "./config/env.js";
import mongoPlugin from "./plugins/mongo.js";
import rootRoutes from "./routes/root.js";
import healthRoutes from "./routes/health.js";
import clientRoutes from "./routes/clients.js";
import businessRoutes from "./routes/business.js";

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
      files: 2,
    },
  });

  await app.register(mongoPlugin, {
    mongoUri: env.mongoUri,
    dbName: env.dbName,
  });
  await app.register(rootRoutes);
  await app.register(healthRoutes);
  await app.register(clientRoutes, {
    prefix: "/api/clients",
  });
  await app.register(businessRoutes, {
    prefix: "/api/business",
  });

  return app;
}

export default buildApp;
