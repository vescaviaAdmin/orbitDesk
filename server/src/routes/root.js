async function rootRoutes(fastify) {
  fastify.get("/", async () => {
    return {
      message: "Fastify server is running",
      signupEndpoint: "/api/clients/signup",
      businessLoginEndpoint: "/api/business/login",
    };
  });
}

export default rootRoutes;
