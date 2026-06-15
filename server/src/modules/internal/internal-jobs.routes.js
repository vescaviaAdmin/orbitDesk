import { createInternalJobsController } from "./internal-jobs.controller.js";

async function internalJobsRoutes(fastify) {
  const controller = createInternalJobsController(fastify);

  fastify.post("/internal/jobs/ticket-due-reminders", controller.sendTicketDueReminders);
}

export default internalJobsRoutes;
