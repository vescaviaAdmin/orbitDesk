import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

import sensiblePlugin from "./plugins/sensible.js";
import authPlugin from "./plugins/auth.js";
import connectDatabase from "./config/database.js";
import env from "./config/env.js";

import rootRoutes from "./routes/root.js";
import healthRoutes from "./routes/health.js";

import clientAuthRoutes from "./modules/auth/client.routes.js";
import memberAuthRoutes from "./modules/auth/member.routes.js";
import adminAuthRoutes from "./modules/auth/admin.routes.js";

import adminRoutes from "./modules/admin/admin.routes.js";
import memberProjectRoutes from "./modules/member/member-project.routes.js";
import clientProjectRoutes from "./modules/client/client-project.routes.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://orbit-desk-rlfh.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getAllowedOrigins() {
  if (Array.isArray(env.allowedOrigins)) {
    return [...DEFAULT_ALLOWED_ORIGINS, ...env.allowedOrigins];
  }

  if (typeof env.allowedOrigins === "string") {
    return [
      ...DEFAULT_ALLOWED_ORIGINS,
      ...env.allowedOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ];
  }

  return DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(origin) {
  // Allow non-browser requests like Postman, curl, health checks
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);

    // Allow all Vercel preview deployments
    if (protocol === "https:" && hostname.endsWith(".vercel.app")) {
      return true;
    }

    // Allow local development
    if (
      protocol === "http:" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      app.log.warn({ origin }, "Blocked by CORS");
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"],
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
  await app.register(adminAuthRoutes);

  await app.register(adminRoutes);
  await app.register(memberProjectRoutes);
  await app.register(clientProjectRoutes);

  return app;
}

export default buildApp;