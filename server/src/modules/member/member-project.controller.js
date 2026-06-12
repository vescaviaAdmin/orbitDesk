import { createMemberProjectService } from "./member-project.service.js";

export function createMemberProjectController(fastify) {
  const service = createMemberProjectService(fastify);

  return {
    getSkills(request) {
      return service.getSkills(request);
    },
    updateSkills(request) {
      return service.updateSkills(request);
    },
    listProjects(request) {
      return service.listProjects(request);
    },
    getProject(request) {
      return service.getProject(request);
    },
    listTickets(request) {
      return service.listTickets(request);
    },
    getTicket(request) {
      return service.getTicket(request);
    },
    createTicket(request, reply) {
      return service.createTicket(request, reply);
    },
    updateTicketStatus(request) {
      return service.updateTicketStatus(request);
    },
    updateTicket(request) {
      return service.updateTicket(request);
    },
    createRequest(request, reply) {
      return service.createRequest(request, reply);
    },
    addProjectResources(request) {
      return service.addProjectResources(request);
    },
  };
}
