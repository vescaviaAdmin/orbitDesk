async function rootRoutes(fastify) {
  fastify.get("/", async () => {
    return {
      message: "Fastify server is running",
    };
  });
}

export default rootRoutes;
