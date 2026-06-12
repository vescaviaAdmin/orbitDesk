import { createClientProjectService } from "./client-project.service.js";

export function createClientProjectController(fastify) {
  const service = createClientProjectService(fastify);

  return {
    listProjects(request) {
      return service.listProjects(request);
    },
    listIssues(request) {
      return service.listIssues(request);
    },
    createIssue(request, reply) {
      return service.createIssue(request, reply);
    },
  };
}
