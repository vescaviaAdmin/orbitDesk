import { createClientProjectController } from "./client-project.controller.js";

async function clientProjectRoutes(fastify) {
  const controller = createClientProjectController(fastify);

  fastify.get("/client/projects", controller.listProjects);
  fastify.get("/client/issues", controller.listIssues);
  fastify.post("/client/projects/:projectId/issues", controller.createIssue);
}

export default clientProjectRoutes;
