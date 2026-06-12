import mongoose from "mongoose";

export const TICKET_STATUSES = ["open", "in_progress", "done", "cancel"];
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
export const TICKET_TYPES = ["bug", "feature", "task", "improvement"];

export function normalizeTicketPayload(body = {}) {
  return {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    assignedTo: body.assignedTo,
    deadline: body.deadline,
    parsedDeadline: new Date(body.deadline),
    sprintSelection: body.sprintSelection || "",
    status: body.status ?? "open",
    priority: body.priority ?? "medium",
    type: body.type ?? "task",
    urls: Array.isArray(body.urls) ? body.urls.filter(Boolean) : [],
  };
}

export function assertTicketCoreFields({ title, assignedTo, deadline }, fastify) {
  if (!title || !assignedTo || !deadline) {
    throw fastify.httpErrors.badRequest("title, assignedTo, and deadline are required");
  }
}

export function assertValidDeadline(parsedDeadline, fastify) {
  if (Number.isNaN(parsedDeadline.getTime())) {
    throw fastify.httpErrors.badRequest("deadline must be a valid date");
  }
}

export function assertValidAssigneeId(assignedTo, fastify) {
  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    throw fastify.httpErrors.badRequest("assignedTo must be a valid member id");
  }
}

export function assertTicketEnums({ status, priority, type }, fastify) {
  if (!TICKET_STATUSES.includes(status)) {
    throw fastify.httpErrors.badRequest("status must be open, in_progress, done, or cancel");
  }

  if (!TICKET_PRIORITIES.includes(priority)) {
    throw fastify.httpErrors.badRequest("priority must be low, medium, high, or critical");
  }

  if (!TICKET_TYPES.includes(type)) {
    throw fastify.httpErrors.badRequest("type must be bug, feature, task, or improvement");
  }
}

export function assertTicketStatus(status, fastify) {
  if (!TICKET_STATUSES.includes(status)) {
    throw fastify.httpErrors.badRequest("status must be open, in_progress, done, or cancel");
  }
}
