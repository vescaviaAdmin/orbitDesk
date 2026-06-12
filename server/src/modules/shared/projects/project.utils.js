export function normalizeSprintStatus(status) {
  return ["planned", "in_progress", "completed"].includes(status) ? status : "planned";
}

export function derivePhaseStatus(sprints = []) {
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

export function normalizePlanning(planning = []) {
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

export function resolveSprintSelection(project, sprintSelection, fastify) {
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

export function hasProjectMember(project, memberId) {
  return project.members.some((projectMember) => {
    const projectMemberId = projectMember._id || projectMember;
    return projectMemberId.toString() === memberId;
  });
}

export function hasClientProjectAccess(project, clientEmail) {
  return project?.clientEmail && project.clientEmail === clientEmail;
}
