import Client from "../../models/Client.js";
import Issue from "../../models/Issue.js";
import Project from "../../models/Project.js";
import { requireClient } from "../shared/auth/guards.js";
import { hasClientProjectAccess } from "../shared/projects/project.utils.js";

export function createClientProjectService(fastify) {
  return {
    async listProjects(request) {
      const client = await requireClient(request, fastify);
      const projects = await Project.find({ clientEmail: client.email, ownerAdmin: client.ownerAdmin })
        .sort({ createdAt: -1 })
        .populate("members", "name email status")
        .select("name clientEmail status description planning members createdAt");

      const projectIds = projects.map((project) => project._id);
      const issues = await Issue.find({
        project: { $in: projectIds },
        client: client._id,
        ownerAdmin: client.ownerAdmin,
      }).sort({ createdAt: -1 });

      const issuesByProjectId = issues.reduce((accumulator, issue) => {
        const key = issue.project.toString();

        if (!accumulator.has(key)) {
          accumulator.set(key, []);
        }

        accumulator.get(key).push(issue);
        return accumulator;
      }, new Map());

      return {
        projects: projects.map((project) => ({
          project,
          issues: issuesByProjectId.get(project._id.toString()) || [],
        })),
      };
    },

    async listIssues(request) {
      const client = await requireClient(request, fastify);
      const issues = await Issue.find({ client: client._id, ownerAdmin: client.ownerAdmin })
        .sort({ createdAt: -1 })
        .populate("project", "name status clientEmail");

      return { issues };
    },

    async createIssue(request, reply) {
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
    },
  };
}
