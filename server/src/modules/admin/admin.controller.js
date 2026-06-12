import { createAdminService } from "./admin.service.js";

export function createAdminController(fastify) {
  const service = createAdminService(fastify);

  return {
    getSession(request) {
      return service.getSession(request);
    },
    createClient(request, reply) {
      return service.createClient(request, reply);
    },
    listClients(request) {
      return service.listClients(request);
    },
    createProject(request, reply) {
      return service.createProject(request, reply);
    },
    listProjects(request) {
      return service.listProjects(request);
    },
    listRequests(request) {
      return service.listRequests(request);
    },
    updateRequestStatus(request) {
      return service.updateRequestStatus(request);
    },
    listIssues(request) {
      return service.listIssues(request);
    },
    getProject(request) {
      return service.getProject(request);
    },
    updateProjectMembers(request) {
      return service.updateProjectMembers(request);
    },
    updateSprintStatus(request) {
      return service.updateSprintStatus(request);
    },
    createProjectTicket(request, reply) {
      return service.createProjectTicket(request, reply);
    },
    updateTicket(request) {
      return service.updateTicket(request);
    },
    addProjectResources(request) {
      return service.addProjectResources(request);
    },
    createMember(request, reply) {
      return service.createMember(request, reply);
    },
    listMembers(request) {
      return service.listMembers(request);
    },
    getMember(request) {
      return service.getMember(request);
    },
  };
}
