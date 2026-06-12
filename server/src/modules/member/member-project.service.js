import Client from "../../models/Client.js";
import Project from "../../models/Project.js";
import Request from "../../models/Request.js";
import Ticket from "../../models/Ticket.js";
import { sendTicketAssignedMail } from "../mail/mail.service.js";
import { requireMember } from "../shared/auth/guards.js";
import { normalizeMemberCourses, normalizeMemberSkills } from "../shared/members/member-profile.utils.js";
import { hasProjectMember, resolveSprintSelection } from "../shared/projects/project.utils.js";
import { normalizeResources, validateResources } from "../shared/resources/resource.utils.js";
import { assertTicketCoreFields, assertTicketEnums, assertTicketStatus, assertValidAssigneeId, assertValidDeadline, normalizeTicketPayload } from "../shared/tickets/ticket.utils.js";

export function createMemberProjectService(fastify) {
  return {
    async getSkills(request) {
      const member = await requireMember(request, fastify);

      return {
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          skills: member.skills || [],
          recommendedCourses: member.recommendedCourses || [],
        },
      };
    },

    async updateSkills(request) {
      const member = await requireMember(request, fastify);
      const skills = normalizeMemberSkills(request.body?.skills);
      const recommendedCourses = normalizeMemberCourses(request.body?.recommendedCourses);

      member.skills = skills;
      member.recommendedCourses = recommendedCourses;
      await member.save();

      return {
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          skills: member.skills || [],
          recommendedCourses: member.recommendedCourses || [],
        },
        message: "Skills updated",
      };
    },

    async listProjects(request) {
      const member = await requireMember(request, fastify);
      const projects = await Project.find({ members: member._id, ownerAdmin: member.ownerAdmin })
        .sort({ createdAt: -1 })
        .populate("members", "name email status")
        .select("name clientEmail clientCompany status description repositoryUrl category resources planning members createdAt");

      return { projects };
    },

    async getProject(request) {
      const member = await requireMember(request, fastify);
      const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: member.ownerAdmin })
        .populate("members", "name email status")
        .select("name clientEmail clientCompany status description repositoryUrl category resources planning members createdAt");

      if (!project || !hasProjectMember(project, member.id)) {
        throw fastify.httpErrors.notFound("Project not found");
      }

      const tickets = await Ticket.find({ project: project._id, ownerAdmin: member.ownerAdmin })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email");
      const requests = await Request.find({ project: project._id, ownerAdmin: member.ownerAdmin })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email");

      const client = project.clientEmail
        ? await Client.findOne({ email: project.clientEmail, ownerAdmin: member.ownerAdmin }).select("name email agreementDocument")
        : null;

      return {
        project,
        client,
        requests,
        tickets,
      };
    },

    async listTickets(request) {
      const member = await requireMember(request, fastify);
      const tickets = await Ticket.find({ assignedTo: member._id, ownerAdmin: member.ownerAdmin })
        .sort({ createdAt: -1 })
        .populate("project", "name")
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email");

      return { tickets };
    },

    async getTicket(request) {
      const member = await requireMember(request, fastify);
      const ticket = await Ticket.findOne({ _id: request.params.ticketId, ownerAdmin: member.ownerAdmin })
        .populate({
          path: "project",
          select: "name clientEmail status description members",
          populate: {
            path: "members",
            select: "name email status",
          },
        })
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email");

      if (!ticket || !hasProjectMember(ticket.project, member.id)) {
        throw fastify.httpErrors.notFound("Ticket not found");
      }

      return { ticket };
    },

    async createTicket(request, reply) {
      const member = await requireMember(request, fastify);
      const ticketInput = normalizeTicketPayload(request.body);

      assertTicketCoreFields(ticketInput, fastify);
      assertValidDeadline(ticketInput.parsedDeadline, fastify);
      assertValidAssigneeId(ticketInput.assignedTo, fastify);
      assertTicketEnums(ticketInput, fastify);

      const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: member.ownerAdmin }).populate(
        "members",
        "name email status",
      );

      if (!project || !hasProjectMember(project, member.id)) {
        throw fastify.httpErrors.notFound("Project not found");
      }

      if (!hasProjectMember(project, ticketInput.assignedTo)) {
        throw fastify.httpErrors.badRequest("Ticket can only be assigned to a member in this project");
      }

      const sprint = ticketInput.sprintSelection
        ? resolveSprintSelection(project, ticketInput.sprintSelection, fastify)
        : undefined;

      const ticket = await Ticket.create({
        project: project._id,
        title: ticketInput.title,
        description: ticketInput.description,
        priority: ticketInput.priority,
        type: ticketInput.type,
        urls: ticketInput.urls,
        deadline: ticketInput.parsedDeadline,
        createdBy: member._id,
        assignedTo: ticketInput.assignedTo,
        sprint,
        status: ticketInput.status,
        ownerAdmin: member.ownerAdmin,
      });

      await ticket.populate("createdBy", "name email");
      await ticket.populate("assignedTo", "name email");
      await ticket.populate("project", "name");

      let message = "Ticket raised successfully";

      try {
        await sendTicketAssignedMail(fastify, ticket.assignedTo, ticket, project);
        message = "Ticket raised and assignee notified by email";
      } catch (mailError) {
        fastify.log.warn(
          {
            err: mailError,
            memberId: ticket.assignedTo?._id,
            projectId: project._id,
            ticketId: ticket._id,
          },
          "Ticket was created but assignment email could not be sent",
        );
        message = "Ticket raised successfully, but the email notification could not be sent";
      }

      reply.code(201);

      return {
        ticket,
        message,
      };
    },

    async updateTicketStatus(request) {
      const member = await requireMember(request, fastify);
      const { status } = request.body || {};

      assertTicketStatus(status, fastify);

      const ticket = await Ticket.findOne({ _id: request.params.ticketId, ownerAdmin: member.ownerAdmin })
        .populate("project", "name members")
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email");

      if (!ticket || !hasProjectMember(ticket.project, member.id)) {
        throw fastify.httpErrors.notFound("Ticket not found");
      }

      ticket.status = status;
      await ticket.save();
      await ticket.populate({
        path: "project",
        select: "name clientEmail status description members",
        populate: {
          path: "members",
          select: "name email status",
        },
      });

      return {
        ticket,
        message: "Ticket status updated",
      };
    },

    async updateTicket(request) {
      const member = await requireMember(request, fastify);
      const ticketInput = normalizeTicketPayload(request.body);

      assertTicketCoreFields(ticketInput, fastify);
      assertValidDeadline(ticketInput.parsedDeadline, fastify);
      assertValidAssigneeId(ticketInput.assignedTo, fastify);
      assertTicketEnums(ticketInput, fastify);

      const ticket = await Ticket.findOne({ _id: request.params.ticketId, ownerAdmin: member.ownerAdmin }).populate(
        "project",
        "name members",
      );

      if (!ticket || !hasProjectMember(ticket.project, member.id)) {
        throw fastify.httpErrors.notFound("Ticket not found");
      }

      if (!hasProjectMember(ticket.project, ticketInput.assignedTo)) {
        throw fastify.httpErrors.badRequest("Ticket can only be assigned to a member in this project");
      }

      ticket.title = ticketInput.title;
      ticket.description = ticketInput.description;
      ticket.assignedTo = ticketInput.assignedTo;
      ticket.deadline = ticketInput.parsedDeadline;
      ticket.status = ticketInput.status;
      ticket.priority = ticketInput.priority;
      ticket.type = ticketInput.type;
      ticket.urls = ticketInput.urls;
      await ticket.save();

      await ticket.populate("createdBy", "name email");
      await ticket.populate("createdByAdmin", "name email");
      await ticket.populate("assignedTo", "name email");
      await ticket.populate({
        path: "project",
        select: "name clientEmail status description members",
        populate: {
          path: "members",
          select: "name email status",
        },
      });

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
          "Ticket was updated by member but assignment email could not be sent",
        );
        message = "Ticket updated successfully, but the email notification could not be sent";
      }

      return {
        ticket,
        message,
      };
    },

    async createRequest(request, reply) {
      const member = await requireMember(request, fastify);
      const { title, description = "" } = request.body || {};

      if (!title) {
        throw fastify.httpErrors.badRequest("title is required");
      }

      const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: member.ownerAdmin }).populate(
        "members",
        "name email status",
      );

      if (!project || !hasProjectMember(project, member.id)) {
        throw fastify.httpErrors.notFound("Project not found");
      }

      const createdRequest = await Request.create({
        project: project._id,
        title,
        description,
        createdBy: member._id,
        ownerAdmin: member.ownerAdmin,
      });

      await createdRequest.populate("createdBy", "name email");
      await createdRequest.populate("project", "name clientEmail");

      reply.code(201);

      return {
        request: createdRequest,
        message: "Request raised for admin review",
      };
    },

    async addProjectResources(request) {
      const member = await requireMember(request, fastify);
      const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: member.ownerAdmin }).populate(
        "members",
        "name email status",
      );

      if (!project || !hasProjectMember(project, member.id)) {
        throw fastify.httpErrors.notFound("Project not found");
      }

      const normalizedProjectResources = normalizeResources(request.body?.resources, {
        role: "member",
        name: member.name || member.email,
      });

      if (!normalizedProjectResources.length) {
        throw fastify.httpErrors.badRequest("At least one resource is required");
      }

      validateResources(normalizedProjectResources, fastify);
      project.resources.push(...normalizedProjectResources);
      await project.save();

      return {
        project,
        message: normalizedProjectResources.length === 1 ? "Project resource added" : "Project resources added",
      };
    },
  };
}
