import Client from "../../models/Client.js";
import Issue from "../../models/Issue.js";
import Project from "../../models/Project.js";

async function requireClient(request, fastify) {
  await fastify.authenticate(request);

  if (request.user.role !== "client") {
    throw fastify.httpErrors.forbidden("Client access required");
  }

  const client = await Client.findById(request.user.sub);
  if (!client || client.status !== "active" || !client.ownerAdmin) {
    throw fastify.httpErrors.unauthorized("Active client account is required");
  }

  return client;
}

function hasClientProjectAccess(project, clientEmail) {
  return project?.clientEmail && project.clientEmail === clientEmail;
}

async function clientProjectRoutes(fastify) {
  fastify.get("/client/projects", async (request) => {
    const client = await requireClient(request, fastify);

    const projects = await Project.find({ clientEmail: client.email, ownerAdmin: client.ownerAdmin })
      .sort({ createdAt: -1 })
      .populate("members", "name email status")
      .select("name clientEmail status description planning members createdAt");

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const issues = await Issue.find({ project: project._id, client: client._id, ownerAdmin: client.ownerAdmin }).sort({ createdAt: -1 });

        return {
          project,
          issues,
        };
      }),
    );

    return {
      projects: enrichedProjects,
    };
  });

  fastify.get("/client/issues", async (request) => {
    const client = await requireClient(request, fastify);

    const issues = await Issue.find({ client: client._id, ownerAdmin: client.ownerAdmin })
      .sort({ createdAt: -1 })
      .populate("project", "name status clientEmail");

    return {
      issues,
    };
  });

  fastify.post("/client/projects/:projectId/issues", async (request, reply) => {
    const client = await requireClient(request, fastify);
    const { title, description = "" } = request.body || {};

    if (!title) {
      throw fastify.httpErrors.badRequest("title is required");
    }

    const project = await Project.findOne({ _id: request.params.projectId, ownerAdmin: client.ownerAdmin });

    if (!project || !hasClientProjectAccess(project, client.email)) {
      throw fastify.httpErrors.notFound("Project not found");
    }

    const issue = await Issue.create({
      project: project._id,
      client: client._id,
      title,
      description,
      ownerAdmin: client.ownerAdmin,
    });

    await issue.populate("project", "name status clientEmail");
    await issue.populate("client", "name email company");

    reply.code(201);
    return {
      issue,
      message: "Issue submitted for admin review",
    };
  });
}

export default clientProjectRoutes;
