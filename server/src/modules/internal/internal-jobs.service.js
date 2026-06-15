import Ticket from "../../models/Ticket.js";
import env from "../../config/env.js";
import { sendTicketDueReminderMail } from "../mail/mail.service.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_BATCH_SIZE = 50;

function getBearerToken(request) {
  const header = request.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length).trim();
}

function isLoopbackRequest(request) {
  const ip = String(request.ip || "").trim();
  const hostname = String(request.hostname || "").trim().toLowerCase();

  return ip === "127.0.0.1" || ip === "::1" || ip.endsWith("127.0.0.1") || hostname === "localhost" || hostname === "127.0.0.1";
}

function requireCronSecret(request, fastify) {
  if (!env.cronSecret) {
    if (env.nodeEnv !== "production" && isLoopbackRequest(request)) {
      fastify.log.warn("CRON_SECRET is not configured, allowing local internal job request in non-production mode");
      return;
    }

    const error = new Error("CRON_SECRET is not configured");
    error.statusCode = 503;
    throw error;
  }

  if (getBearerToken(request) !== env.cronSecret) {
    throw fastify.httpErrors.unauthorized("Invalid cron secret");
  }
}

export function createInternalJobsService(fastify) {
  return {
    async sendTicketDueReminders(request) {
      requireCronSecret(request, fastify);

      const now = new Date();
      const dueBefore = new Date(now.getTime() + ONE_DAY_MS);
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const tickets = await Ticket.find({
        status: { $nin: ["done", "cancel"] },
        deadline: {
          $gte: todayStart,
          $lte: dueBefore,
        },
        $or: [{ dueReminderSentAt: null }, { dueReminderSentAt: { $exists: false } }],
      })
        .sort({ deadline: 1 })
        .limit(REMINDER_BATCH_SIZE)
        .populate("assignedTo", "name email")
        .populate("project", "name");

      const result = {
        scanned: tickets.length,
        sent: 0,
        skipped: 0,
        failed: 0,
        failures: [],
      };

      for (const ticket of tickets) {
        if (!ticket.assignedTo?.email || !ticket.project?.name) {
          result.skipped += 1;
          fastify.log.warn(
            {
              ticketId: ticket._id,
              assignedTo: ticket.assignedTo?._id || null,
              project: ticket.project?._id || null,
            },
            "Skipping due reminder because ticket is missing assignee email or project",
          );
          continue;
        }

        try {
          await sendTicketDueReminderMail(fastify, ticket.assignedTo, ticket, ticket.project);

          const update = await Ticket.updateOne(
            {
              _id: ticket._id,
              $or: [{ dueReminderSentAt: null }, { dueReminderSentAt: { $exists: false } }],
            },
            {
              $set: {
                dueReminderSentAt: new Date(),
              },
            },
          );

          if (update.modifiedCount > 0) {
            result.sent += 1;
          } else {
            result.skipped += 1;
          }
        } catch (error) {
          result.failed += 1;
          result.failures.push({
            ticketId: ticket._id,
            message: error.message,
          });
          fastify.log.warn(
            {
              ticketId: ticket._id,
              err: error,
            },
            "Ticket due reminder failed",
          );
        }
      }

      return {
        message: "Ticket due reminder job completed",
        window: {
          from: todayStart,
          to: dueBefore,
        },
        ...result,
      };
    },
  };
}
