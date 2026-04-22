import {
  createClientSignup,
  requestClientLoginOtp,
  setClientPassword,
  verifyClientLoginOtp,
} from "../controllers/clientSignupController.js";

async function clientRoutes(fastify) {
  fastify.post("/signup", createClientSignup);
  fastify.post("/set-password", setClientPassword);
  fastify.post("/login/request-otp", requestClientLoginOtp);
  fastify.post("/login/verify-otp", verifyClientLoginOtp);
}

export default clientRoutes;
