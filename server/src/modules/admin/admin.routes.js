import { createAdminController } from "./admin.controller.js";

async function adminRoutes(fastify) {
  const controller = createAdminController(fastify);

  fastify.get("/admin/session", controller.getSession);
  fastify.post("/admin/clients", controller.createClient);
  fastify.get("/admin/clients", controller.listClients);
  fastify.post("/admin/projects", controller.createProject);
  fastify.get("/admin/projects", controller.listProjects);
  fastify.get("/admin/requests", controller.listRequests);
  fastify.put("/admin/requests/:requestId/status", controller.updateRequestStatus);
  fastify.get("/admin/issues", controller.listIssues);
  fastify.get("/admin/projects/:projectId", controller.getProject);
  fastify.put("/admin/projects/:projectId/members", controller.updateProjectMembers);
  fastify.put("/admin/projects/:projectId/phases/:phaseIndex/sprints/:sprintIndex/status", controller.updateSprintStatus);
  fastify.post("/admin/projects/:projectId/tickets", controller.createProjectTicket);
  fastify.put("/admin/tickets/:ticketId", controller.updateTicket);
  fastify.post("/admin/projects/:projectId/resources", controller.addProjectResources);
  fastify.post("/admin/members", controller.createMember);
  fastify.get("/admin/members", controller.listMembers);
  fastify.get("/admin/members/:memberId", controller.getMember);
}

export default adminRoutes;
