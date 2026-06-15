import { createMemberProjectController } from "./member-project.controller.js";

async function memberProjectRoutes(fastify) {
  const controller = createMemberProjectController(fastify);

  fastify.get("/member/skills", controller.getSkills);
  fastify.put("/member/skills", controller.updateSkills);
  fastify.get("/member/projects", controller.listProjects);
  fastify.get("/member/workspace-summary", controller.getWorkspaceSummary);
  fastify.get("/member/projects/:projectId", controller.getProject);
  fastify.get("/member/tickets", controller.listTickets);
  fastify.get("/member/tickets/:ticketId", controller.getTicket);
  fastify.post("/member/projects/:projectId/tickets", controller.createTicket);
  fastify.put("/member/tickets/:ticketId/status", controller.updateTicketStatus);
  fastify.put("/member/tickets/:ticketId", controller.updateTicket);
  fastify.post("/member/projects/:projectId/requests", controller.createRequest);
  fastify.post("/member/projects/:projectId/resources", controller.addProjectResources);
}

export default memberProjectRoutes;
