import { PriorityBadge, StatusBadge, TicketIdBadge, TypeBadge } from "../ui/Badges";
import { cn, formatDate, formatDeadlineDate, getTicketKey, hasLessThan24HoursLeft } from "../../lib/utils";

function getTicketStatusBorderClass(status) {
  const normalized = (status || "open").toLowerCase();

  if (normalized === "done") {
    return "ticket-card-status-done";
  }

  if (normalized === "in_progress") {
    return "ticket-card-status-in-progress";
  }

  if (normalized === "cancel") {
    return "ticket-card-status-cancel";
  }

  if (normalized === "open") {
    return "ticket-card-status-open";
  }

  return "";
}

function TicketCard({ onClick, ticket }) {
  const isDueSoon = hasLessThan24HoursLeft(ticket?.deadline);

  return (
    <button
      className={cn("ticket-card w-full text-left", getTicketStatusBorderClass(ticket?.status), isDueSoon && "ticket-card-due-soon")}
      onClick={onClick}
      type="button"
    >
      <div className="flex min-h-[168px] flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 text-base font-semibold text-slate-900">{ticket.title}</h4>
            <p className="muted-text mt-2 line-clamp-2 text-sm">{ticket.description || "No description provided."}</p>
          </div>
          <div className="flex items-center gap-2">
            {isDueSoon ? <span aria-label="Due within 24 hours" className="ticket-card-alert-dot" role="img" /> : null}
            <div className="ticket-card-action" aria-hidden="true">
              ↗
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <TicketIdBadge ticketId={getTicketKey(ticket)} />
          <TypeBadge type={ticket.type} />
          <PriorityBadge priority={ticket.priority} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="avatar-badge h-8 w-8 text-xs font-semibold">
              {(ticket.assignedTo?.name || ticket.assignedTo?.email || "U").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{ticket.assignedTo?.name || ticket.assignedTo?.email || "Unassigned"}</p>
              <p className="muted-text text-xs">{formatDate(ticket.createdAt)}</p>
            </div>
          </div>
          <span className="muted-text text-xs">{formatDeadlineDate(ticket.deadline)}</span>
        </div>
      </div>
    </button>
  );
}

export default TicketCard;
