import mongoose from "mongoose";

export const TICKET_STATUSES = ["open", "in_progress", "done", "cancel"];
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
export const TICKET_TYPES = ["bug", "feature", "task", "improvement"];

export function parseTicketDeadline(deadline) {
  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}/.test(deadline)) {
    const [year, month, day] = deadline.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
  }

  return new Date(deadline);
}

export function normalizeTicketPayload(body = {}) {
  return {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    assignedTo: body.assignedTo,
    deadline: body.deadline,
    parsedDeadline: parseTicketDeadline(body.deadline),
    sprintSelection: body.sprintSelection || "",
    status: body.status ?? "open",
    priority: body.priority ?? "medium",
    type: body.type ?? "task",
    urls: Array.isArray(body.urls) ? body.urls.filter(Boolean) : [],
  };
}

export function withTicketListDetails(query, { includeAdminCreator = false } = {}) {
  let nextQuery = query
    .populate("project", "name")
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  if (includeAdminCreator) {
    nextQuery = nextQuery.populate("createdByAdmin", "name email");
  }

  return nextQuery;
}

export async function populateTicketDetails(ticket, { includeAdminCreator = false } = {}) {
  await ticket.populate("createdBy", "name email");

  if (includeAdminCreator) {
    await ticket.populate("createdByAdmin", "name email");
  }

  await ticket.populate("assignedTo", "name email");
  await ticket.populate("project", "name");

  return ticket;
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
