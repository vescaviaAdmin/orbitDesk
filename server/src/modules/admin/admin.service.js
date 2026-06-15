import Client from "../../models/Client.js";
import Issue from "../../models/Issue.js";
import Member from "../../models/Member.js";
import Project from "../../models/Project.js";
import Request from "../../models/Request.js";
import Ticket from "../../models/Ticket.js";
import { assertEmailAvailable, normalizeEmail } from "../../utils/identity.js";
import { runInBackground } from "../../utils/background-task.js";
import { hashSecret } from "../../utils/password.js";
import { createSecureToken } from "../../utils/tokens.js";
import { sendClientPasswordSetup, sendMemberPasswordSetup, sendTicketAssignedMail } from "../mail/mail.service.js";
import { uploadAgreementDocument } from "../uploads/agreement.service.js";
import { requireAdmin } from "../shared/auth/guards.js";
import { normalizeMemberCourses, normalizeMemberSkills } from "../shared/members/member-profile.utils.js";
import { derivePhaseStatus, normalizePlanning, normalizeSprintStatus, resolveSprintSelection } from "../shared/projects/project.utils.js";
import { normalizeResources, validateResources } from "../shared/resources/resource.utils.js";
import { assertTicketCoreFields, assertTicketEnums, assertValidDeadline, normalizeTicketPayload, parseTicketDeadline } from "../shared/tickets/ticket.utils.js";

export function createAdminService(fastify) {
  const REQUEST_STATUSES = ["open", "reviewing", "closed"];

  return {
    async getSession(request) {
      const admin = await requireAdmin(request, fastify);

      return {
        ok: true,
        admin: {
          id: admin.id,
          name: admin.name || admin.email,
          email: admin.email,
        },
      };
    },

    async createClient(request, reply) {
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
        client: {
          _id: client.id,
          name: client.name,
          email: client.email,
          company: client.company,
          phone: client.phone,
          status: client.status,
          agreementDocument: client.agreementDocument,
          onboardedAt: client.onboardedAt,
          passwordSetAt: client.passwordSetAt,
          createdAt: client.createdAt,
        },
        message: "Client onboarded and password setup mail sent",
      };
    },

    async listClients(request) {
      const admin = await requireAdmin(request, fastify);
      const clients = await Client.find({ ownerAdmin: admin._id })
        .sort({ createdAt: -1 })
        .select("name email company phone status agreementDocument onboardedAt passwordSetAt createdAt");

      return { clients };
    },

    async createProject(request, reply) {
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

      const normalizedProjectPlanning = normalizePlanning(planning);
      const normalizedProjectResources = normalizeResources(resources, {
        role: "admin",
        name: admin.name || admin.email,
      });

      validateResources(normalizedProjectResources, fastify);

      const project = await Project.create({
        name,
        clientEmail: normalizedClientEmail,
        clientCompany,
        status,
        description,
        repositoryUrl,
        category,
        resources: normalizedProjectResources,
        planning: normalizedProjectPlanning,
        members: activeMembers.map((member) => member._id),
        ownerAdmin: admin._id,
      });

      await project.populate({
        path: "members",
        select: "name email status",
        match: { ownerAdmin: admin._id },
      });

      reply.code(201);

      return {
        project,
        message: "Project added",
      };
    },

    async listProjects(request) {
      const admin = await requireAdmin(request, fastify);
      const projects = await Project.find({ ownerAdmin: admin._id })
        .sort({ createdAt: -1 })
        .select("name clientEmail clientCompany status description repositoryUrl category resources planning members createdAt")
        .populate({
          path: "members",
          select: "name email status",
          match: { ownerAdmin: admin._id },
        });

      return { projects };
    },

    async listRequests(request) {
      const admin = await requireAdmin(request, fastify);
      const requests = await Request.find({ ownerAdmin: admin._id })
        .sort({ createdAt: -1 })
        .populate("project", "name clientEmail status")
        .populate("createdBy", "name email");

      return { requests };
    },

    async updateRequestStatus(request) {
      const admin = await requireAdmin(request, fastify);
      const { status } = request.body || {};

      if (!REQUEST_STATUSES.includes(status)) {
        throw fastify.httpErrors.badRequest("status must be open, reviewing, or closed");
      }

      const requestItem = await Request.findOne({ _id: request.params.requestId, ownerAdmin: admin._id })
        .populate("project", "name clientEmail status")
        .populate("createdBy", "name email");

      if (!requestItem) {
        throw fastify.httpErrors.notFound("Request not found");
      }

      requestItem.status = status;
      await requestItem.save();

      return {
        request: requestItem,
        message: "Request status updated",
      };
    },

    async listIssues(request) {
      const admin = await requireAdmin(request, fastify);
      const issues = await Issue.find({ ownerAdmin: admin._id })
        .sort({ createdAt: -1 })
        .populate("project", "name clientEmail status")
        .populate("client", "name email company");

      return { issues };
    },

    async getProject(request) {
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
    },

    async updateProjectMembers(request) {
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
    },

    async updateSprintStatus(request) {
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
    },

    async createProjectTicket(request, reply) {
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

      assertTicketCoreFields({ title, assignedTo, deadline }, fastify);
      const parsedDeadline = parseTicketDeadline(deadline);
      assertValidDeadline(parsedDeadline, fastify);
      assertTicketEnums({ status, priority, type }, fastify);

      const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id }).populate(
        "members",
        "_id name email",
      );

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
        deadline: parsedDeadline,
        createdByAdmin: admin._id,
        assignedTo,
        sprint,
        status,
        ownerAdmin: admin._id,
      });

      await ticket.populate("createdByAdmin", "name email");
      await ticket.populate("assignedTo", "name email");
      await ticket.populate("project", "name");

      runInBackground(
        fastify,
        "admin-ticket-assignment-mail",
        () => sendTicketAssignedMail(fastify, ticket.assignedTo, ticket, project),
        {
          memberId: ticket.assignedTo?._id,
          projectId: project._id,
          ticketId: ticket._id,
        },
      );

      reply.code(201);

      return {
        ticket,
        message: "Ticket raised and assigned. Assignee notification is being processed.",
      };
    },

    async updateTicket(request) {
      const admin = await requireAdmin(request, fastify);
      const ticketInput = normalizeTicketPayload(request.body);

      assertTicketCoreFields(ticketInput, fastify);
      assertValidDeadline(ticketInput.parsedDeadline, fastify);
      assertTicketEnums(ticketInput, fastify);

      const ticket = await Ticket.findOne({ _id: request.params.ticketId, ownerAdmin: admin._id }).populate(
        "project",
        "name members",
      );

      if (!ticket) {
        throw fastify.httpErrors.notFound("Ticket not found");
      }

      const project = await Project.findOne({ _id: ticket.project?._id || ticket.project, ownerAdmin: admin._id }).populate(
        "members",
        "_id name email",
      );

      if (!project) {
        throw fastify.httpErrors.notFound("Project not found");
      }

      const isAssignedMemberInProject = project.members.some((member) => member._id.toString() === ticketInput.assignedTo);

      if (!isAssignedMemberInProject) {
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

      await ticket.populate("createdByAdmin", "name email");
      await ticket.populate("createdBy", "name email");
      await ticket.populate("assignedTo", "name email");
      await ticket.populate("project", "name");

      runInBackground(
        fastify,
        "admin-ticket-update-mail",
        () => sendTicketAssignedMail(fastify, ticket.assignedTo, ticket, ticket.project),
        {
          memberId: ticket.assignedTo?._id,
          projectId: ticket.project?._id,
          ticketId: ticket._id,
        },
      );

      return {
        ticket,
        message: "Ticket updated successfully. Assignee notification is being processed.",
      };
    },

    async addProjectResources(request) {
      const admin = await requireAdmin(request, fastify);
      const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: admin._id }).populate({
        path: "members",
        select: "name email status",
        match: { ownerAdmin: admin._id },
      });

      if (!project) {
        throw fastify.httpErrors.notFound("Project not found");
      }

      const normalizedProjectResources = normalizeResources(request.body?.resources, {
        role: "admin",
        name: admin.name || admin.email,
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

    async createMember(request, reply) {
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
        member: {
          _id: member.id,
          name: member.name,
          email: member.email,
          status: member.status,
          invitedAt: member.invitedAt,
          passwordSetAt: member.passwordSetAt,
          createdAt: member.createdAt,
          skills: member.skills || [],
        },
        message: "Member added and password setup mail sent",
      };
    },

    async listMembers(request) {
      const admin = await requireAdmin(request, fastify);
      const members = await Member.find({ ownerAdmin: admin._id })
        .sort({ createdAt: -1 })
        .select("name email status invitedAt passwordSetAt createdAt skills");

      return { members };
    },

    async getMember(request) {
      const admin = await requireAdmin(request, fastify);
      const member = await Member.findOne({ _id: request.params.memberId, ownerAdmin: admin._id }).select(
        "name email status invitedAt passwordSetAt createdAt skills recommendedCourses",
      );

      if (!member) {
        throw fastify.httpErrors.notFound("Member not found");
      }

      const projects = await Project.find({ ownerAdmin: admin._id, members: member._id })
        .sort({ createdAt: -1 })
        .select("name status clientEmail category createdAt");

      return {
        member: {
          ...member.toObject(),
          skills: normalizeMemberSkills(member.skills),
          recommendedCourses: normalizeMemberCourses(member.recommendedCourses),
        },
        projects,
      };
    },
  };
}
