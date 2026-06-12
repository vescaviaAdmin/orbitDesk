import { useEffect, useState } from "react";
import CreateTicketDialog from "./CreateTicketDialog";
import { PriorityBadge, StatusBadge, TicketIdBadge, TypeBadge } from "../ui/Badges";
import { formatDate, getTicketKey } from "../../lib/utils";

function TicketDetailsDrawer({ loading, members = [], onClose, onUpdateTicket, ticket }) {
  const [isEditing, setIsEditing] = useState(false);
  const initialValues = {
    title: ticket?.title || "",
    description: ticket?.description || "",
    priority: ticket?.priority || "medium",
    type: ticket?.type || "task",
    status: ticket?.status || "open",
    assignedTo: ticket?.assignedTo?._id || "",
    deadline: ticket?.deadline || "",
    urlsText: (ticket?.urls || []).join("\n"),
  };

  useEffect(() => {
    if (!ticket) {
      setIsEditing(false);
    }
  }, [ticket]);

  if (!ticket) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/25 p-3 sm:p-6">
        <div className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
            <div>
              <p className="eyebrow">Ticket Details</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{ticket.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="secondary-button px-3 py-2" onClick={() => setIsEditing(true)} type="button">
                Edit
              </button>
              <button aria-label="Close ticket details" className="secondary-button px-3 py-2" onClick={onClose} type="button">
                Close
              </button>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto p-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={ticket.status} />
              <TicketIdBadge ticketId={getTicketKey(ticket)} />
              <PriorityBadge priority={ticket.priority} />
              <TypeBadge type={ticket.type} />
            </div>

            <section className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Description</p>
              <p className="text-sm leading-6 text-slate-600">{ticket.description || "No description provided."}</p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoTile label="Assignee" value={ticket.assignedTo?.name || ticket.assignedTo?.email || "Unassigned"} />
              <InfoTile label="Project" value={ticket.project?.name || "-"} />
              <InfoTile label="Created" value={formatDate(ticket.createdAt)} />
              <InfoTile label="Due date" value={formatDate(ticket.deadline)} />
            </div>

            {ticket.urls?.length ? (
              <section className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Links</p>
                <div className="space-y-2">
                  {ticket.urls.map((url) => (
                    <a className="link-accent block rounded-xl border border-slate-200 px-4 py-3 text-sm" href={url} key={url} rel="noreferrer" target="_blank">
                      {url}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
      <CreateTicketDialog
        initialValues={initialValues}
        loading={loading}
        members={members}
        onClose={() => setIsEditing(false)}
        onSubmit={(payload) => onUpdateTicket(ticket._id, payload, () => setIsEditing(false))}
        open={isEditing}
        projectName={ticket.project?.name || "Project"}
        showStatusField
        submitLabel="Save changes"
        titleLabel="Edit Ticket"
      />
    </>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default TicketDetailsDrawer;
