import Admin from "../../models/Admin.js";
import Member from "../../models/Member.js";
import Client from "../../models/Client.js";
import Project from "../../models/Project.js";
import Request from "../../models/Request.js";
import Ticket from "../../models/Ticket.js";
import Issue from "../../models/Issue.js";
import { sendClientPasswordSetup, sendMemberPasswordSetup, sendTicketAssignedMail } from "../mail/mail.service.js";
import { createSecureToken } from "../../utils/tokens.js";
import { hashSecret } from "../../utils/password.js";
import { uploadAgreementDocument } from "../uploads/agreement.service.js";
import { assertEmailAvailable, normalizeEmail } from "../../utils/identity.js";

function normalizeSprintStatus(status) {
  return ["planned", "in_progress", "completed"].includes(status) ? status : "planned";
}

const TICKET_STATUSES = ["open", "in_progress", "done", "cancel"];
const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
const TICKET_TYPES = ["bug", "feature", "task", "improvement"];

function derivePhaseStatus(sprints = []) {
  const statuses = sprints.map((sprint) => normalizeSprintStatus(sprint?.status));

  if (!statuses.length) {
    return "planned";
  }

  if (statuses.every((status) => status === "completed")) {
    return "completed";
  }

  if (statuses.some((status) => status === "in_progress" || status === "completed")) {
    return "in_progress";
  }

  return "planned";
}

function normalizePlanning(planning = []) {
  return Array.isArray(planning)
    ? planning.map((phase) => {
        const normalizedSprints = Array.isArray(phase?.sprints)
          ? phase.sprints.map((sprint) => ({
              name: sprint?.name || "",
              startDate: sprint?.startDate || "",
              endDate: sprint?.endDate || "",
              outcome: sprint?.outcome || "",
              status: normalizeSprintStatus(sprint?.status),
              tickets: Array.isArray(sprint?.tickets)
                ? sprint.tickets.map((ticket) => ({
                    title: ticket?.title || "",
                    outcome: ticket?.outcome || "",
                  }))
                : [],
            }))
          : [];

        return {
          name: phase?.name || "",
          startDate: phase?.startDate || "",
          endDate: phase?.endDate || "",
          outcome: phase?.outcome || "",
          status: derivePhaseStatus(normalizedSprints),
          sprints: normalizedSprints,
        };
      })
    : [];
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeResources(resources = [], actor) {
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources
    .map((resource) => ({
      name: String(resource?.name || "").trim(),
      url: String(resource?.url || "").trim(),
      addedByRole: actor.role,
      addedByName: actor.name,
      addedAt: new Date(),
    }))
    .filter((resource) => resource.name || resource.url);
}

function validateResources(resources, fastify) {
  resources.forEach((resource, index) => {
    if (!resource.name) {
      throw fastify.httpErrors.badRequest(`resource ${index + 1} name is required`);
    }

    if (!resource.url) {
      throw fastify.httpErrors.badRequest(`resource ${index + 1} url is required`);
    }

    if (!isValidHttpUrl(resource.url)) {
      throw fastify.httpErrors.badRequest(`resource ${index + 1} must use a valid http or https URL`);
    }
  });
}

function resolveSprintSelection(project, sprintSelection, fastify) {
  const [phaseIndexRaw, sprintIndexRaw] = String(sprintSelection || "").split(":");
  const phaseIndex = Number(phaseIndexRaw);
  const sprintIndex = Number(sprintIndexRaw);
  const phase = project.planning?.[phaseIndex];
  const sprint = phase?.sprints?.[sprintIndex];

  if (!Number.isInteger(phaseIndex) || !Number.isInteger(sprintIndex) || !phase || !sprint) {
    throw fastify.httpErrors.badRequest("A valid sprint selection is required");
  }

  return {
    phaseIndex,
    phaseName: phase.name || `Phase ${phaseIndex + 1}`,
    sprintIndex,
    sprintName: sprint.name || `Sprint ${sprintIndex + 1}`,
  };
}

async function requireAdmin(request, fastify) {
  await fastify.authenticate(request);

  if (request.user.role !== "admin") {
    throw fastify.httpErrors.forbidden("Admin access required");
  }

  const admin = await Admin.findById(request.user.sub);
  if (!admin || admin.status !== "active") {
    throw fastify.httpErrors.unauthorized("Active admin account is required");
  }

  return admin;
}

async function adminRoutes(fastify) {
  fastify.get("/admin/session", async (request) => {
    const admin = await requireAdmin(request, fastify);

    return {
      ok: true,
      admin: {
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
      },
    };
  });

  fastify.post("/admin/clients", async (request, reply) => {
    const admin = await requireAdmin(request, fastify);

    if (!request.isMultipart()) {
      throw fastify.httpErrors.badRequest("Client onboarding requires multipart form data");
    }

    const parts = request.parts();
    const fields = {};
    let agreementFile = null;

    for await (const part of parts) {
      if (part.type === "file") {
        if (part.fieldname === "agreement") {
          agreementFile = {
            buffer: await part.toBuffer(),
            filename: part.filename,
            mimetype: part.mimetype,
          };
        } else {
          part.file.resume();
        }
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    const normalizedEmail = normalizeEmail(fields.email);
    const { name, company = "", phone = "" } = fields;

    if (!name || !normalizedEmail) {
      throw fastify.httpErrors.badRequest("name and email are required");
    }

    if (!agreementFile) {
      throw fastify.httpErrors.badRequest("signed agreement document is required");
    }

    await assertEmailAvailable(normalizedEmail, fastify);

    const agreementDocument = await uploadAgreementDocument(fastify, agreementFile);
    const setupToken = createSecureToken();
    const client = await Client.create({
      name,
      email: normalizedEmail,
      company,
      phone,
      agreementDocument,
      passwordSetTokenHash: await hashSecret(setupToken),
      passwordSetTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      onboardedAt: new Date(),
      status: "invited",
      ownerAdmin: admin._id,
    });

    await sendClientPasswordSetup(fastify, client, setupToken);

    reply.code(201);
    return {
      id: client.id,
      email: client.email,
      status: client.status,
      message: "Client onboarded and password setup mail sent",
    };
  });

  fastify.get("/admin/clients", async (request) => {
    const admin = await requireAdmin(request, fastify);

    const clients = await Client.find({ ownerAdmin: admin._id })
      .sort({ createdAt: -1 })
      .select("name email company phone status agreementDocument onboardedAt passwordSetAt createdAt");
    return {
      clients,
    };
  });

  fastify.post("/admin/projects", async (request, reply) => {
    const admin = await requireAdmin(request, fastify);
    const {
      name,
      clientEmail = "",
      clientCompany = "",
      status = "planned",
      description = "",
      repositoryUrl = "",
      category = "",
      resources = [],
      planning = [],
      memberIds = [],
    } = request.body || {};
    const normalizedClientEmail = normalizeEmail(clientEmail);

    if (!name) {
      throw fastify.httpErrors.badRequest("project name is required");
    }

    if (normalizedClientEmail) {
      const client = await Client.findOne({ email: normalizedClientEmail, ownerAdmin: admin._id });
      if (!client) {
        throw fastify.httpErrors.badRequest("Client must belong to your admin workspace");
      }
    }

    const activeMembers = await Member.find({
      _id: { $in: Array.isArray(memberIds) ? memberIds : [] },
      status: "active",
      ownerAdmin: admin._id,
    }).select("_id");

    const normalizedPlanning = normalizePlanning(planning);
    const normalizedResources = normalizeResources(resources, {
      role: "admin",
      name: admin.name || admin.email,
    });
    validateResources(normalizedResources, fastify);

    const project = await Project.create({
      name,
      clientEmail: normalizedClientEmail,
      clientCompany,
      status,
      description,
      repositoryUrl,
      category,
      resources: normalizedResources,
      planning: normalizedPlanning,
      members: activeMembers.map((member) => member._id),
      ownerAdmin: admin._id,
    });

    reply.code(201);
    return {
      project,
      message: "Project added",
    };
  });

  fastify.get("/admin/projects", async (request) => {
    const admin = await requireAdmin(request, fastify);

    const projects = await Project.find({ ownerAdmin: admin._id })
      .sort({ createdAt: -1 })
      .select("name clientEmail clientCompany status description repositoryUrl category resources planning members createdAt")
      .populate({
        path: "members",
        select: "name email status",
        match: { ownerAdmin: admin._id },
      });
    return {
      projects,
    };
  });

  fastify.get("/admin/requests", async (request) => {
    const admin = await requireAdmin(request, fastify);

    const requests = await Request.find({ ownerAdmin: admin._id })
      .sort({ createdAt: -1 })
      .populate("project", "name clientEmail status")
      .populate("createdBy", "name email");

    return {
      requests,
    };
  });

  fastify.get("/admin/issues", async (request) => {
    const admin = await requireAdmin(request, fastify);

    const issues = await Issue.find({ ownerAdmin: admin._id })
      .sort({ createdAt: -1 })
      .populate("project", "name clientEmail status")
      .populate("client", "name email company");

    return {
      issues,
    };
  });

  fastify.get("/admin/projects/:projectId", async (request) => {
    const admin = await requireAdmin(request, fastify);

    const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id })
      .populate({
        path: "members",
        select: "name email status",
        match: { ownerAdmin: admin._id },
      })
      .select("name clientEmail clientCompany status description repositoryUrl category resources planning members createdAt");

    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const tickets = await Ticket.find({ project: project.id, ownerAdmin: admin._id })
      .sort({ createdAt: -1 })
      .populate("project", "name")
      .populate("createdBy", "name email")
      .populate("createdByAdmin", "name email")
      .populate("assignedTo", "name email");

    return {
      project,
      tickets,
    };
  });

  fastify.put("/admin/projects/:projectId/members", async (request) => {
    const admin = await requireAdmin(request, fastify);
    const { memberIds = [] } = request.body || {};
    const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id });

    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const activeMembers = await Member.find({
      _id: { $in: memberIds },
      status: "active",
      ownerAdmin: admin._id,
    }).select("_id");

    project.members = activeMembers.map((member) => member._id);
    await project.save();
    await project.populate("members", "name email status");

    return {
      project,
      message: "Project members updated",
    };
  });

  fastify.put("/admin/projects/:projectId/phases/:phaseIndex/sprints/:sprintIndex/status", async (request) => {
    const admin = await requireAdmin(request, fastify);
    const { status } = request.body || {};
    const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id });

    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const phaseIndex = Number(request.params.phaseIndex);
    const sprintIndex = Number(request.params.sprintIndex);
    const phase = project.planning?.[phaseIndex];
    const sprint = phase?.sprints?.[sprintIndex];

    if (!phase || !sprint) {
      throw fastify.httpErrors.notFound("Sprint not found");
    }

    sprint.status = normalizeSprintStatus(status);
    phase.status = derivePhaseStatus(phase.sprints);
    await project.save();

    return {
      project,
      message: "Sprint status updated",
    };
  });

  fastify.post("/admin/projects/:projectId/tickets", async (request, reply) => {
    const admin = await requireAdmin(request, fastify);
    const {
      title,
      description = "",
      assignedTo,
      deadline,
      sprintSelection = "",
      status = "open",
      priority = "medium",
      type = "task",
      urls = [],
    } = request.body || {};

    if (!title || !assignedTo || !deadline) {
      throw fastify.httpErrors.badRequest("title, assignedTo, and deadline are required");
    }

    if (!TICKET_STATUSES.includes(status)) {
      throw fastify.httpErrors.badRequest("status must be open, in_progress, done, or cancel");
    }

    if (!TICKET_PRIORITIES.includes(priority)) {
      throw fastify.httpErrors.badRequest("priority must be low, medium, high, or critical");
    }

    if (!TICKET_TYPES.includes(type)) {
      throw fastify.httpErrors.badRequest("type must be bug, feature, task, or improvement");
    }

    const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id }).populate("members", "_id name email");
    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const isAssignedMemberInProject = project.members.some((member) => member._id.toString() === assignedTo);
    if (!isAssignedMemberInProject) {
      throw fastify.httpErrors.badRequest("Ticket can only be assigned to a member in this project");
    }

    const normalizedUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];
    const sprint = sprintSelection ? resolveSprintSelection(project, sprintSelection, fastify) : undefined;

    const ticket = await Ticket.create({
      project: project._id,
      title,
      description,
      priority,
      type,
      urls: normalizedUrls,
      deadline: new Date(deadline),
      createdByAdmin: admin._id,
      assignedTo,
      sprint,
      status,
      ownerAdmin: admin._id,
    });

    await ticket.populate("createdByAdmin", "name email");
    await ticket.populate("assignedTo", "name email");
    await ticket.populate("project", "name");

    let message = "Ticket raised and assigned to project member";

    try {
      await sendTicketAssignedMail(fastify, ticket.assignedTo, ticket, project);
      message = "Ticket raised, assigned, and assignee notified by email";
    } catch (mailError) {
      fastify.log.warn(
        {
          err: mailError,
          memberId: ticket.assignedTo?._id,
          projectId: project._id,
          ticketId: ticket._id,
        },
        "Ticket was created by admin but assignment email could not be sent",
      );
      message = "Ticket raised and assigned, but the email notification could not be sent";
    }

    reply.code(201);
    return {
      ticket,
      message,
    };
  });

  fastify.put("/admin/tickets/:ticketId", async (request) => {
    const admin = await requireAdmin(request, fastify);
    const {
      title,
      description = "",
      assignedTo,
      deadline,
      status,
      priority,
      type,
      urls = [],
    } = request.body || {};

    const normalizedTitle = String(title || "").trim();
    const normalizedDescription = String(description || "").trim();
    const parsedDeadline = new Date(deadline);

    if (!normalizedTitle || !assignedTo || !deadline) {
      throw fastify.httpErrors.badRequest("title, assignedTo, and deadline are required");
    }

    if (Number.isNaN(parsedDeadline.getTime())) {
      throw fastify.httpErrors.badRequest("deadline must be a valid date");
    }

    if (!TICKET_STATUSES.includes(status)) {
      throw fastify.httpErrors.badRequest("status must be open, in_progress, done, or cancel");
    }

    if (!TICKET_PRIORITIES.includes(priority)) {
      throw fastify.httpErrors.badRequest("priority must be low, medium, high, or critical");
    }

    if (!TICKET_TYPES.includes(type)) {
      throw fastify.httpErrors.badRequest("type must be bug, feature, task, or improvement");
    }

    const ticket = await Ticket.findOne({ _id: request.params.ticketId, ownerAdmin: admin._id }).populate("project", "name members");
    if (!ticket) {
      throw fastify.httpErrors.notFound("Ticket not found");
    }

    const project = await Project.findOne({ _id: ticket.project?._id || ticket.project, ownerAdmin: admin._id }).populate("members", "_id name email");
    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const isAssignedMemberInProject = project.members.some((member) => member._id.toString() === assignedTo);
    if (!isAssignedMemberInProject) {
      throw fastify.httpErrors.badRequest("Ticket can only be assigned to a member in this project");
    }

    const normalizedUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];

    ticket.title = normalizedTitle;
    ticket.description = normalizedDescription;
    ticket.assignedTo = assignedTo;
    ticket.deadline = parsedDeadline;
    ticket.status = status;
    ticket.priority = priority;
    ticket.type = type;
    ticket.urls = normalizedUrls;
    await ticket.save();

    await ticket.populate("createdByAdmin", "name email");
    await ticket.populate("createdBy", "name email");
    await ticket.populate("assignedTo", "name email");
    await ticket.populate("project", "name");

    let message = "Ticket updated successfully";

    try {
      await sendTicketAssignedMail(fastify, ticket.assignedTo, ticket, ticket.project);
      message = "Ticket updated and assignee notified by email";
    } catch (mailError) {
      fastify.log.warn(
        {
          err: mailError,
          memberId: ticket.assignedTo?._id,
          projectId: ticket.project?._id,
          ticketId: ticket._id,
        },
        "Ticket was updated by admin but assignment email could not be sent",
      );
      message = "Ticket updated successfully, but the email notification could not be sent";
    }

    return {
      ticket,
      message,
    };
  });

  fastify.post("/admin/projects/:projectId/resources", async (request) => {
    const admin = await requireAdmin(request, fastify);
    const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id })
      .populate({
        path: "members",
        select: "name email status",
        match: { ownerAdmin: admin._id },
      });

    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const normalizedResources = normalizeResources(request.body?.resources, {
      role: "admin",
      name: admin.name || admin.email,
    });

    if (!normalizedResources.length) {
      throw fastify.httpErrors.badRequest("At least one resource is required");
    }

    validateResources(normalizedResources, fastify);
    project.resources.push(...normalizedResources);
    await project.save();

    return {
      project,
      message: normalizedResources.length === 1 ? "Project resource added" : "Project resources added",
    };
  });

  fastify.post("/admin/members", async (request, reply) => {
    const admin = await requireAdmin(request, fastify);
    const { name } = request.body || {};
    const normalizedEmail = normalizeEmail(request.body?.email);

    if (!name || !normalizedEmail) {
      throw fastify.httpErrors.badRequest("name and email are required");
    }

    await assertEmailAvailable(normalizedEmail, fastify);

    const setupToken = createSecureToken();
    const member = await Member.create({
      name,
      email: normalizedEmail,
      passwordSetTokenHash: await hashSecret(setupToken),
      passwordSetTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      invitedAt: new Date(),
      status: "invited",
      ownerAdmin: admin._id,
    });

    await sendMemberPasswordSetup(fastify, member, setupToken);

    reply.code(201);
    return {
      id: member.id,
      email: member.email,
      status: member.status,
      message: "Member added and password setup mail sent",
    };
  });

  fastify.get("/admin/members", async (request) => {
    const admin = await requireAdmin(request, fastify);

    const members = await Member.find({ ownerAdmin: admin._id })
      .sort({ createdAt: -1 })
      .select("name email status invitedAt passwordSetAt createdAt");
    return {
      members,
    };
  });
}

export default adminRoutes;
