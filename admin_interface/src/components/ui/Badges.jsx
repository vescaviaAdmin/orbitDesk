import { cn, normalizeLabel } from "../../lib/utils";

function pillClasses(value, map, fallback) {
  return cn("badge", map[(value || "").toLowerCase()] || fallback);
}

export function StatusBadge({ status }) {
  const normalized = (status || "open").toLowerCase();
  return (
    <span
      className={pillClasses(
        normalized,
        {
          open: "badge-info",
          planned: "badge-warning",
          active: "badge-info",
          in_progress: "badge-warning",
          resolved: "badge-success",
          completed: "badge-success",
          closed: "badge-muted",
          done: "badge-success",
          paused: "badge-muted",
          blocked: "badge-danger",
        },
        "badge-muted",
      )}
    >
      {normalizeLabel(status, "open")}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const normalized = (priority || "medium").toLowerCase();
  const icon =
    normalized === "critical" || normalized === "high"
      ? "↑"
      : normalized === "low"
        ? "↓"
        : "→";
  return (
    <span
      className={pillClasses(
        normalized,
        {
          critical: "badge-danger",
          high: "badge-high",
          medium: "badge-warning",
          low: "badge-muted",
        },
        "badge-muted",
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {normalizeLabel(priority, "medium")}
    </span>
  );
}

export function TypeBadge({ type }) {
  const normalized = (type || "task").toLowerCase();
  return (
    <span
      className={pillClasses(
        normalized,
        {
          bug: "badge-danger-soft",
          feature: "badge-primary",
          task: "badge-info",
          improvement: "badge-success",
        },
        "badge-info",
      )}
    >
      {normalizeLabel(type, "task")}
    </span>
  );
}

export function TicketIdBadge({ ticketId }) {
  return <span className="badge badge-ticket">{ticketId}</span>;
}
