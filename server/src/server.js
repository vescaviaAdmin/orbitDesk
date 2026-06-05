import buildApp from "./app.js";
import env from "./config/env.js";

async function startServer() {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.port,
      host: env.host,
    });

    app.log.info(`Server listening on ${env.host}:${env.port}`);
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
