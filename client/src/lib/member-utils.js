export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function normalizeStatus(status) {
  return (status || "open").replaceAll("_", " ");
}

export function getProjectTone(status) {
  const normalized = (status || "").toLowerCase();

  if (["completed", "done", "resolved"].includes(normalized)) {
    return "completed";
  }

  if (["active", "assigned", "in_progress", "review"].includes(normalized)) {
    return "assigned";
  }

  if (["planned", "pending", "open"].includes(normalized)) {
    return "pending";
  }

  return "neutral";
}

export function getStatusTone(status) {
  const normalized = (status || "open").toLowerCase();

  if (["done", "completed", "closed"].includes(normalized)) {
    return "completed";
  }

  if (["in_progress", "active", "assigned"].includes(normalized)) {
    return "assigned";
  }

  if (["paused", "blocked", "open", "pending"].includes(normalized)) {
    return "pending";
  }

  if (["cancel", "cancelled", "canceled"].includes(normalized)) {
    return "neutral";
  }

  return "neutral";
}

export function countPlannedTickets(planning = []) {
  return planning.reduce(
    (total, phase) =>
      total +
      (phase.sprints || []).reduce((sprintTotal, sprint) => sprintTotal + (sprint.tickets?.length || 0), 0),
    0,
  );
}

export function countProjectSprints(project) {
  return (project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0);
}

export function projectExpectedTime(project) {
  const datedPhases = (project?.planning || []).filter((phase) => phase.endDate);
  if (!datedPhases.length) {
    return "Timeline not set";
  }

  const latestPhase = datedPhases.reduce((latest, phase) =>
    new Date(phase.endDate) > new Date(latest.endDate) ? phase : latest,
  );

  return formatDate(latestPhase.endDate);
}

export function filterAndSortTickets(tickets, { query = "", projectId = "", status = "", sort = "updatedAt" }) {
  const normalizedQuery = query.trim().toLowerCase();

  let result = tickets.filter((ticket) => {
    if (projectId && ticket.project?._id !== projectId) {
      return false;
    }

    if (status && ticket.status !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [ticket.title, ticket.description, ticket.project?.name, ticket.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  result = [...result].sort((left, right) => {
    if (sort === "title") {
      return (left.title || "").localeCompare(right.title || "");
    }

    if (sort === "deadline") {
      const leftDate = left.deadline ? new Date(left.deadline).getTime() : Number.POSITIVE_INFINITY;
      const rightDate = right.deadline ? new Date(right.deadline).getTime() : Number.POSITIVE_INFINITY;
      return leftDate - rightDate;
    }

    const leftUpdated = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightUpdated = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightUpdated - leftUpdated;
  });

  return result;
}
