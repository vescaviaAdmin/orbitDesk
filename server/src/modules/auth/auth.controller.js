import { createAuthService } from "./auth.service.js";

export function createAuthController(fastify) {
  const service = createAuthService(fastify);

  return {
    adminGetStarted(request, reply) {
      return service.adminGetStarted(request.body, reply);
    },
    adminLogin(request) {
      return service.adminLogin(request.body);
    },
    adminForgotPassword(request) {
      return service.adminForgotPassword(request.body);
    },
    adminSetPassword(request) {
      return service.adminSetPassword(request.body);
    },
    memberLogin(request) {
      return service.memberLogin(request.body);
    },
    memberForgotPassword(request) {
      return service.memberForgotPassword(request.body);
    },
    memberSetPassword(request) {
      return service.memberSetPassword(request.body);
    },
    clientRegister(request, reply) {
      return service.clientRegister(request.body, reply);
    },
    clientRequestOtp(request) {
      return service.clientRequestOtp(request.body);
    },
    login(request) {
      return service.login(request.body);
    },
    clientLogin(request) {
      return service.clientLogin(request.body);
    },
    clientSetPassword(request) {
      return service.clientSetPassword(request.body);
    },
  };
}
