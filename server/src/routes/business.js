import { loginBusiness } from "../controllers/businessLoginController.js";

async function businessRoutes(fastify) {
  fastify.post("/login", loginBusiness);
}

export default businessRoutes;
