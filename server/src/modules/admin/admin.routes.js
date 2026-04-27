import Member from "../../models/Member.js";
import Client from "../../models/Client.js";
import Project from "../../models/Project.js";
import Request from "../../models/Request.js";
import Ticket from "../../models/Ticket.js";
import Issue from "../../models/Issue.js";
import env from "../../config/env.js";
import { sendClientPasswordSetup, sendMemberPasswordSetup } from "../mail/mail.service.js";
import { createSecureToken } from "../../utils/tokens.js";
import { hashSecret } from "../../utils/password.js";
import { uploadAgreementDocument } from "../uploads/agreement.service.js";

function requireAdminSecret(request, fastify) {
  const providedSecret = request.headers["x-admin-secret"];

  if (providedSecret !== env.adminApiSecret) {
    throw fastify.httpErrors.unauthorized("Invalid admin secret");
  }
}

async function adminRoutes(fastify) {
  fastify.get("/admin/session", async (request) => {
    requireAdminSecret(request, fastify);

    return {
      ok: true,
    };
  });

  fastify.post("/admin/clients", async (request, reply) => {
    requireAdminSecret(request, fastify);

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

    const { name, email, company = "", phone = "" } = fields;

    if (!name || !email) {
      throw fastify.httpErrors.badRequest("name and email are required");
    }

    if (!agreementFile) {
      throw fastify.httpErrors.badRequest("signed agreement document is required");
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      throw fastify.httpErrors.conflict("Client email already exists");
    }

    const agreementDocument = await uploadAgreementDocument(fastify, agreementFile);
    const setupToken = createSecureToken();
    const client = await Client.create({
      name,
      email,
      company,
      phone,
      agreementDocument,
      passwordSetTokenHash: await hashSecret(setupToken),
      passwordSetTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      onboardedAt: new Date(),
      status: "invited",
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
    requireAdminSecret(request, fastify);

    const clients = await Client.find()
      .sort({ createdAt: -1 })
      .select("name email company phone status agreementDocument onboardedAt passwordSetAt createdAt");
    return {
      clients,
    };
  });

  fastify.post("/admin/projects", async (request, reply) => {
    requireAdminSecret(request, fastify);

    const { name, clientEmail = "", status = "planned", description = "", planning = [] } = request.body || {};

    if (!name) {
      throw fastify.httpErrors.badRequest("project name is required");
    }

    const normalizedPlanning = Array.isArray(planning)
      ? planning.map((phase) => ({
          name: phase?.name || "",
          startDate: phase?.startDate || "",
          endDate: phase?.endDate || "",
          outcome: phase?.outcome || "",
          sprints: Array.isArray(phase?.sprints)
            ? phase.sprints.map((sprint) => ({
                name: sprint?.name || "",
                startDate: sprint?.startDate || "",
                endDate: sprint?.endDate || "",
                outcome: sprint?.outcome || "",
                tickets: Array.isArray(sprint?.tickets)
                  ? sprint.tickets.map((ticket) => ({
                      title: ticket?.title || "",
                      outcome: ticket?.outcome || "",
                    }))
                  : [],
              }))
            : [],
        }))
      : [];

    const project = await Project.create({
      name,
      clientEmail,
      status,
      description,
      planning: normalizedPlanning,
    });

    reply.code(201);
    return {
      project,
      message: "Project added",
    };
  });

  fastify.get("/admin/projects", async (request) => {
    requireAdminSecret(request, fastify);

    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .select("name clientEmail status description planning members createdAt")
      .populate("members", "name email status");
    return {
      projects,
    };
  });

  fastify.get("/admin/requests", async (request) => {
    requireAdminSecret(request, fastify);

    const requests = await Request.find()
      .sort({ createdAt: -1 })
      .populate("project", "name clientEmail status")
      .populate("createdBy", "name email");

    return {
      requests,
    };
  });

  fastify.get("/admin/issues", async (request) => {
    requireAdminSecret(request, fastify);

    const issues = await Issue.find()
      .sort({ createdAt: -1 })
      .populate("project", "name clientEmail status")
      .populate("client", "name email company");

    return {
      issues,
    };
  });

  fastify.get("/admin/projects/:projectId", async (request) => {
    requireAdminSecret(request, fastify);

    const project = await Project.findById(request.params.projectId)
      .populate("members", "name email status")
      .select("name clientEmail status description planning members createdAt");

    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const tickets = await Ticket.find({ project: project.id })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    return {
      project,
      tickets,
    };
  });

  fastify.put("/admin/projects/:projectId/members", async (request) => {
    requireAdminSecret(request, fastify);

    const { memberIds = [] } = request.body || {};
    const project = await Project.findById(request.params.projectId);

    if (!project) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const activeMembers = await Member.find({
      _id: { $in: memberIds },
      status: "active",
    }).select("_id");

    project.members = activeMembers.map((member) => member._id);
    await project.save();
    await project.populate("members", "name email status");

    return {
      project,
      message: "Project members updated",
    };
  });

  fastify.post("/admin/members", async (request, reply) => {
    requireAdminSecret(request, fastify);

    const { name, email } = request.body || {};

    if (!name || !email) {
      throw fastify.httpErrors.badRequest("name and email are required");
    }

    const existingMember = await Member.findOne({ email });
    if (existingMember) {
      throw fastify.httpErrors.conflict("Member email already exists");
    }

    const setupToken = createSecureToken();
    const member = await Member.create({
      name,
      email,
      passwordSetTokenHash: await hashSecret(setupToken),
      passwordSetTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      invitedAt: new Date(),
      status: "invited",
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
    requireAdminSecret(request, fastify);

    const members = await Member.find().sort({ createdAt: -1 }).select("name email status invitedAt passwordSetAt createdAt");
    return {
      members,
    };
  });
}

export default adminRoutes;
