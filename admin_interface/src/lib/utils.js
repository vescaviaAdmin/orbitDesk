export function cn(...values) {
  return values.filter(Boolean).join(" ");
}

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

export function normalizeLabel(value, fallback = "unknown") {
  return (value || fallback).replaceAll("_", " ");
}

export function getTicketKey(ticket) {
  if (ticket?.ticketKey) {
    return ticket.ticketKey;
  }

  const rawId = ticket?._id || "000000";
  const suffix = rawId.slice(-4).toUpperCase();
  return `JIRA-${suffix}`;
}

export function getProjectKey(project) {
  const rawId = project?._id || "000000";
  const suffix = rawId.slice(-4).toUpperCase();
  return `PROJ-${suffix}`;
}
