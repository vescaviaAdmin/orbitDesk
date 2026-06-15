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

export function parseDeadlineToIST(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 18, 29, 59, 999));
    }
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDeadlineDate(value) {
  const parsed = parseDeadlineToIST(value);

  if (!parsed) {
    return "-";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function hasLessThan24HoursLeft(deadline) {
  const parsed = parseDeadlineToIST(deadline);

  if (!parsed) {
    return false;
  }

  const timeLeft = parsed.getTime() - Date.now();
  return timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000;
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
