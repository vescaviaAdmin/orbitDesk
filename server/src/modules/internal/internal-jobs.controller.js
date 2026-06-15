import { createInternalJobsService } from "./internal-jobs.service.js";

export function createInternalJobsController(fastify) {
  const service = createInternalJobsService(fastify);

  return {
    sendTicketDueReminders(request) {
      return service.sendTicketDueReminders(request);
    },
  };
}
