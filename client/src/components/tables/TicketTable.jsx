import { ExternalLink, FolderOpen } from "lucide-react";
import { formatDeadlineDate, hasLessThan24HoursLeft } from "../../lib/member-utils";
import { routeTo } from "../../lib/navigation";
import { cn } from "../../lib/utils";
import StatusSelect from "../member/StatusSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

function getTicketStatusRowClass(status) {
  const normalized = (status || "open").toLowerCase();

  if (normalized === "done") {
    return "ticket-row-status-done";
  }

  if (normalized === "in_progress") {
    return "ticket-row-status-in-progress";
  }

  if (normalized === "cancel") {
    return "ticket-row-status-cancel";
  }

  if (normalized === "open") {
    return "ticket-row-status-open";
  }

  return "";
}

function getAssigneeLabel(assignedTo) {
  if (!assignedTo) {
    return "Unassigned";
  }

  if (typeof assignedTo === "string") {
    return assignedTo;
  }

  return assignedTo.name || assignedTo.email || "Unassigned";
}

function getAssigneeToneClass(assignedTo) {
  const source =
    typeof assignedTo === "string"
      ? assignedTo
      : assignedTo?._id || assignedTo?.email || assignedTo?.name || "";

  if (!source) {
    return "assignee-pill-muted";
  }

  const toneIndex = Array.from(source).reduce((total, character) => total + character.charCodeAt(0), 0) % 6;
  return `assignee-pill-tone-${toneIndex + 1}`;
}

function IconButton({ children, label, onClick }) {
  return (
    <button aria-label={label} className="icon-button icon-button-sm" onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function EmptyTableState({ copy }) {
  return (
    <div className="empty-state py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-sm font-bold text-muted-foreground">
        OD
      </div>
      <p className="muted-text mt-4 text-sm">{copy}</p>
    </div>
  );
}

export default function TicketTable({
  emptyCopy = "No assigned tickets yet.",
  loading = false,
  onStatusChange,
  showProject = true,
  tickets = [],
}) {
  if (!tickets.length) {
    return (
      <div className="rounded-md border border-border bg-card">
        <EmptyTableState copy={loading ? "Loading tickets..." : emptyCopy} />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Issue</TableHead>
            {showProject ? <TableHead>Project</TableHead> : null}
            <TableHead>Status</TableHead>
            <TableHead className="w-[11rem] text-center">Assignee</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const isDueSoon = hasLessThan24HoursLeft(ticket.deadline);
            const ticketStatusRowClass = getTicketStatusRowClass(ticket.status);
            const assigneeLabel = getAssigneeLabel(ticket.assignedTo);
            const assigneeToneClass = getAssigneeToneClass(ticket.assignedTo);

            return (
              <TableRow className={cn(ticketStatusRowClass, isDueSoon && "ticket-row-due-soon")} key={ticket._id}>
                <TableCell
                  className={cn(
                    "min-w-[220px] max-w-md py-2",
                    ticketStatusRowClass && "ticket-row-status-cell ticket-row-status-cell-first",
                    isDueSoon && "ticket-row-due-soon-cell ticket-row-due-soon-cell-first",
                  )}
                >
                  <button className="table-primary-link" onClick={() => routeTo(`/member/tickets/${ticket._id}`)} type="button">
                    <span className="table-link-text">
                      <span className="table-link-title">{ticket.title}</span>
                      {ticket.description ? <span className="table-link-meta">{ticket.description}</span> : null}
                    </span>
                  </button>
                </TableCell>
                {showProject ? (
                  <TableCell className={cn("whitespace-nowrap", ticketStatusRowClass && "ticket-row-status-cell", isDueSoon && "ticket-row-due-soon-cell")}>
                    {ticket.project?._id ? (
                      <button
                        className="font-semibold text-primary hover:underline"
                        onClick={() => routeTo(`/member/projects/${ticket.project._id}`)}
                        type="button"
                      >
                        {ticket.project.name}
                      </button>
                    ) : (
                      <span className="muted-text">Project</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell className={cn(ticketStatusRowClass && "ticket-row-status-cell", isDueSoon && "ticket-row-due-soon-cell")}>
                  <label className="sr-only" htmlFor={`ticket-status-${ticket._id}`}>
                    Status for {ticket.title}
                  </label>
                  <StatusSelect
                    className="max-w-[9.5rem]"
                    disabled={loading}
                    id={`ticket-status-${ticket._id}`}
                    onChange={(event) => onStatusChange(ticket._id, event.target.value)}
                    status={ticket.status}
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    "w-[11rem] whitespace-nowrap text-center",
                    ticketStatusRowClass && "ticket-row-status-cell",
                    isDueSoon && "ticket-row-due-soon-cell",
                  )}
                >
                  <span className={cn("assignee-pill", assigneeToneClass)} title={assigneeLabel}>
                    <span className="assignee-pill-label">{assigneeLabel}</span>
                  </span>
                </TableCell>
                <TableCell className={cn("whitespace-nowrap", ticketStatusRowClass && "ticket-row-status-cell", isDueSoon && "ticket-row-due-soon-cell")}>
                  {formatDeadlineDate(ticket.deadline)}
                </TableCell>
                <TableCell
                  className={cn(
                    ticketStatusRowClass && "ticket-row-status-cell ticket-row-status-cell-last",
                    isDueSoon && "ticket-row-due-soon-cell ticket-row-due-soon-cell-last",
                  )}
                >
                  <div className="table-actions">
                    {isDueSoon ? <span aria-label="Due within 24 hours" className="ticket-alert-dot" role="img" /> : null}
                    <IconButton label={`Open ${ticket.title}`} onClick={() => routeTo(`/member/tickets/${ticket._id}`)}>
                      <ExternalLink className="h-4 w-4" />
                    </IconButton>
                    {ticket.project?._id ? (
                      <IconButton
                        label={`Open ${ticket.project.name} project`}
                        onClick={() => routeTo(`/member/projects/${ticket.project._id}`)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </IconButton>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
