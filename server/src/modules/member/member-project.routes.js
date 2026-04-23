import mongoose from "mongoose";
import Client from "../../models/Client.js";
import Member from "../../models/Member.js";
import Project from "../../models/Project.js";
import Ticket from "../../models/Ticket.js";
import { sendTicketAssignedMail } from "../mail/mail.service.js";

async function requireMember(request, fastify) {
  await fastify.authenticate(request);

  if (request.user.role !== "member") {
    throw fastify.httpErrors.forbidden("Member access required");
  }

  const member = await Member.findById(request.user.sub);
  if (!member || member.status !== "active") {
    throw fastify.httpErrors.unauthorized("Active member account is required");
  }

  return member;
}

function hasProjectMember(project, memberId) {
  return project.members.some((projectMember) => {
    const projectMemberId = projectMember._id || projectMember;
    return projectMemberId.toString() === memberId;
  });
}

async function memberProjectRoutes(fastify) {
  fastify.get("/member/projects", async (request) => {
    const member = await requireMember(request, fastify);

    const projects = await Project.find({ members: member._id })
      .sort({ createdAt: -1 })
      .populate("members", "name email status")
      .select("name clientEmail status description members createdAt");

    return {
      projects,
    };
  });

  fastify.get("/member/projects/:projectId", async (request) => {
    const member = await requireMember(request, fastify);
    const project = await Project.findById(request.params.projectId)
      .populate("members", "name email status")
      .select("name clientEmail status description members createdAt");

    if (!project || !hasProjectMember(project, member.id)) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const tickets = await Ticket.find({ project: project._id })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    const client = project.clientEmail
      ? await Client.findOne({ email: project.clientEmail }).select("name email agreementDocument")
      : null;

    return {
      project,
      client,
      tickets,
    };
  });

  fastify.get("/member/tickets", async (request) => {
    const member = await requireMember(request, fastify);

    const tickets = await Ticket.find({ assignedTo: member._id })
      .sort({ createdAt: -1 })
      .populate("project", "name")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    return {
      tickets,
    };
  });

  fastify.get("/member/tickets/:ticketId", async (request) => {
    const member = await requireMember(request, fastify);
    const ticket = await Ticket.findById(request.params.ticketId)
      .populate("project", "name clientEmail status description members")
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    if (!ticket || ticket.assignedTo?._id.toString() !== member.id) {
      throw fastify.httpErrors.notFound("Ticket not found");
    }

    return {
      ticket,
    };
  });

  fastify.post("/member/projects/:projectId/tickets", async (request, reply) => {
    const member = await requireMember(request, fastify);
    const { title, description = "", assignedTo, deadline, urls = [] } = request.body || {};

    if (!title || !assignedTo || !deadline) {
      throw fastify.httpErrors.badRequest("title, assignedTo, and deadline are required");
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw fastify.httpErrors.badRequest("assignedTo must be a valid member id");
    }

    const normalizedUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];

    const project = await Project.findById(request.params.projectId).populate("members", "name email status");

    if (!project || !hasProjectMember(project, member.id)) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    if (!hasProjectMember(project, assignedTo)) {
      throw fastify.httpErrors.badRequest("Ticket can only be assigned to a member in this project");
    }

    const ticket = await Ticket.create({
      project: project._id,
      title,
      description,
      urls: normalizedUrls,
      deadline: new Date(deadline),
      createdBy: member._id,
      assignedTo,
    });

    await ticket.populate("createdBy", "name email");
    await ticket.populate("assignedTo", "name email");
    await ticket.populate("project", "name");
    await sendTicketAssignedMail(fastify, ticket.assignedTo, ticket, project);

    reply.code(201);
    return {
      ticket,
      message: "Ticket raised",
    };
  });
}

export default memberProjectRoutes;
