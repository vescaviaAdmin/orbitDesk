import { ExternalLink, FolderOpen } from "lucide-react";
import { formatDate } from "../../lib/member-utils";
import { routeTo } from "../../lib/navigation";
import StatusSelect from "../member/StatusSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

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
            <TableHead>Due</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket._id}>
              <TableCell className="min-w-[220px] max-w-md py-2">
                <button className="table-primary-link" onClick={() => routeTo(`/member/tickets/${ticket._id}`)} type="button">
                  <span className="table-link-text">
                    <span className="table-link-title">{ticket.title}</span>
                    {ticket.description ? <span className="table-link-meta">{ticket.description}</span> : null}
                  </span>
                </button>
              </TableCell>
              {showProject ? (
                <TableCell className="whitespace-nowrap">
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
              <TableCell>
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
              <TableCell className="whitespace-nowrap">{formatDate(ticket.deadline)}</TableCell>
              <TableCell>
                <div className="table-actions">
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
