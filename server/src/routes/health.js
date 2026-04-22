async function healthRoutes(fastify) {
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });
}

export default healthRoutes;
