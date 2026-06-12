import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../ui/Badges";
import EmptyState from "../ui/EmptyState";
import CreateTicketDialog from "../tickets/CreateTicketDialog";
import TicketCard from "../tickets/TicketCard";
import TicketDetailsDrawer from "../tickets/TicketDetailsDrawer";
import { formatDate } from "../../lib/utils";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "tickets", label: "Tickets" },
  { key: "activity", label: "Activity" },
];

function ProjectWorkspacePage({
  loading,
  memberSearch,
  onAddResources,
  onBack,
  onCreateTicket,
  onEditTicket,
  onSaveMembers,
  onSearchMembers,
  onToggleMember,
  project,
  searchedMembers,
  selectedMemberIds,
  selectedMembers,
  tickets,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resourceRows, setResourceRows] = useState([]);

  useEffect(() => {
    setResourceRows([]);
  }, [project?._id]);

  const summary = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      progress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      done: tickets.filter((ticket) => ticket.status === "done").length,
    }),
    [tickets],
  );

  if (!project) {
    return (
      <section className="surface-card mt-6 p-6">
        <div className="loading-skeleton h-8 w-40" />
        <div className="loading-skeleton mt-4 h-28 w-full" />
      </section>
    );
  }

  const projectResources = project.resources || [];

  function addResourceRow() {
    setResourceRows((current) => [...current, { name: "", url: "" }]);
  }

  function updateResourceRow(index, field, value) {
    setResourceRows((current) => current.map((resource, currentIndex) => (currentIndex === index ? { ...resource, [field]: value } : resource)));
  }

  function removeResourceRow(index) {
    setResourceRows((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSaveResources() {
    const normalizedResources = resourceRows
      .map((resource) => ({
        name: resource.name.trim(),
        url: resource.url.trim(),
      }))
      .filter((resource) => resource.name || resource.url);

    if (!normalizedResources.length) {
      return;
    }

    await onAddResources(normalizedResources);
    setResourceRows([]);
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <button className="secondary-button" onClick={onBack} type="button">
              Back to projects
            </button>
            <div>
              <p className="eyebrow">Project Details</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="section-title">{project.name}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="muted-text mt-3 max-w-3xl text-sm leading-6">{project.description || "No project description provided."}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="secondary-button" onClick={() => setActiveTab("tickets")} type="button">
              View tickets
            </button>
            <button className="primary-button" onClick={() => setIsCreateOpen(true)} type="button">
              Raise ticket
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Client/company" value={project.clientCompany || project.clientEmail || "-"} />
          <InfoCard label="GitHub repo" value={project.repositoryUrl || "-"} />
          <InfoCard label="Project type" value={project.category || "-"} />
          <InfoCard label="Created" value={formatDate(project.createdAt)} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              className={`tab-pill ${activeTab === tab.key ? "tab-pill-active" : ""}`}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="detail-layout">
          <section className="detail-main-stack">
            <div className="surface-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Ticket Summary</p>
                  <h3 className="compact-panel-title mt-3">Current issue volume</h3>
                </div>
                <button className="secondary-button" onClick={() => setIsCreateOpen(true)} type="button">
                  Create ticket
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Total tickets" value={summary.total} />
                <InfoCard label="Open" value={summary.open} />
                <InfoCard label="In progress" value={summary.progress} />
                <InfoCard label="Done" value={summary.done} />
              </div>
            </div>

            <div className="surface-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Recent Tickets</p>
                  <h3 className="compact-panel-title mt-3">Latest raised issues</h3>
                </div>
                <span className="glass-chip">{tickets.length} items</span>
              </div>

              <div className="ticket-grid mt-6">
                {tickets.slice(0, 5).map((ticket) => (
                  <TicketCard key={ticket._id} onClick={() => setSelectedTicket(ticket)} ticket={ticket} />
                ))}
                {!tickets.length ? (
                  <EmptyState
                    action={
                      <button className="primary-button" onClick={() => setIsCreateOpen(true)} type="button">
                        Raise first ticket
                      </button>
                    }
                    copy="No tickets raised yet for this project."
                    title="No tickets yet"
                  />
                ) : null}
              </div>
            </div>

            <div className="surface-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Resources</p>
                  <h3 className="compact-panel-title mt-3">Project links and references</h3>
                </div>
                <button className="secondary-button" onClick={addResourceRow} type="button">
                  Add resource
                </button>
              </div>

              {resourceRows.length ? (
                <div className="mt-5 space-y-3">
                  {resourceRows.map((resource, index) => (
                    <div className="surface-muted p-3" key={`admin-resource-row-${index}`}>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
                        <label className="block text-sm font-semibold text-slate-900">
                          Name
                          <input
                            className="input-field mt-2"
                            onChange={(event) => updateResourceRow(index, "name", event.target.value)}
                            placeholder="PRD"
                            value={resource.name}
                          />
                        </label>

                        <label className="block text-sm font-semibold text-slate-900">
                          Link
                          <input
                            className="input-field mt-2"
                            onChange={(event) => updateResourceRow(index, "url", event.target.value)}
                            placeholder="https://..."
                            value={resource.url}
                          />
                        </label>

                        <button className="secondary-button w-full md:w-auto" onClick={() => removeResourceRow(index)} type="button">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <button className="primary-button" disabled={loading} onClick={handleSaveResources} type="button">
                      {loading ? "Saving..." : "Save resources"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 divide-y divide-slate-200">
                {projectResources.map((resource) => (
                  <a className="flex items-center justify-between gap-3 py-3 first:pt-0 hover:bg-slate-50" href={resource.url} key={`${resource.url}-${resource.addedAt || resource.name}`} rel="noreferrer" target="_blank">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{resource.name || "Project resource"}</p>
                      <p className="muted-text mt-1 truncate text-sm">{resource.url}</p>
                      <p className="muted-text mt-1 text-xs">Added by {resource.addedByName || resource.addedByRole || "workspace"}</p>
                    </div>
                    <span className="badge badge-info">Open</span>
                  </a>
                ))}
                {!projectResources.length ? <EmptyState copy="No project resources linked yet." title="No resources yet" /> : null}
              </div>
            </div>
          </section>

          <aside className="detail-side-stack">
            <div className="surface-card p-6">
              <p className="eyebrow">Overview</p>
              <h3 className="compact-panel-title mt-3">Project and client details</h3>
              <div className="mt-5 space-y-3">
                <MetaRow label="Status" value={project.status} />
                <MetaRow label="Members" value={project.members?.length || 0} />
                <MetaRow label="Category" value={project.category || "-"} />
                <MetaRow label="Client email" value={project.clientEmail || "-"} />
                <MetaRow label="Repository" value={project.repositoryUrl || "-"} />
                <MetaRow label="Resources" value={projectResources.length} />
              </div>
            </div>

            <div className="surface-card p-6">
              <p className="eyebrow">Members</p>
              <h3 className="compact-panel-title mt-3">Assigned team</h3>
              <p className="muted-text mt-3 text-sm">Search active members and attach them to this project workspace.</p>

              <input className="input-field mt-5" onChange={(event) => onSearchMembers(event.target.value)} placeholder="Search active members" value={memberSearch} />

              <div className="mt-5 space-y-3">
                {searchedMembers.map((member) => (
                  <button className="surface-muted flex w-full items-center justify-between gap-3 p-4 text-left hover:border-slate-300" key={member._id} onClick={() => onToggleMember(member._id)} type="button">
                    <div>
                      <p className="font-semibold text-slate-900">{member.name}</p>
                      <p className="muted-text text-sm">{member.email}</p>
                    </div>
                    <span className={`badge ${selectedMemberIds.includes(member._id) ? "badge-primary" : "badge-muted"}`}>
                      {selectedMemberIds.includes(member._id) ? "Assigned" : "Add"}
                    </span>
                  </button>
                ))}
              </div>

              {!searchedMembers.length ? <EmptyState copy="No active members match the search." title="No members found" /> : null}

              {selectedMembers.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <span className="glass-chip" key={member._id}>
                      {member.name}
                    </span>
                  ))}
                </div>
              ) : null}

              <button className="primary-button mt-5 w-full" disabled={loading} onClick={onSaveMembers} type="button">
                {loading ? "Saving..." : "Save team"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {activeTab === "tickets" ? (
        <section className="surface-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Tickets</p>
              <h3 className="section-title mt-3 text-xl">Project ticket list</h3>
            </div>
            <button className="primary-button" onClick={() => setIsCreateOpen(true)} type="button">
              Raise ticket
            </button>
          </div>

          <div className="ticket-grid mt-6">
            {tickets.map((ticket) => (
              <TicketCard key={ticket._id} onClick={() => setSelectedTicket(ticket)} ticket={ticket} />
            ))}
            {!tickets.length ? (
              <EmptyState
                action={
                  <button className="primary-button" onClick={() => setIsCreateOpen(true)} type="button">
                    Raise first ticket
                  </button>
                }
                copy="Start tracking project work by raising the first ticket."
                title="No tickets raised yet"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "activity" ? (
        <section className="surface-card p-6">
          <p className="eyebrow">Activity</p>
          <h3 className="section-title mt-3 text-xl">Recent project timeline</h3>
          <div className="mt-6 space-y-3">
            {[
              `${tickets.length} tickets currently linked to this project.`,
              `${project.members?.length || 0} members assigned to this workspace.`,
              `Project created on ${formatDate(project.createdAt)}.`,
            ].map((item) => (
              <div className="surface-muted p-4 text-sm text-slate-700" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <CreateTicketDialog
        loading={loading}
        members={project.members || []}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(payload) => onCreateTicket(payload, () => setIsCreateOpen(false))}
        open={isCreateOpen}
        projectName={project.name}
      />
      <TicketDetailsDrawer
        loading={loading}
        members={project.members || []}
        onClose={() => setSelectedTicket(null)}
        onUpdateTicket={(ticketId, payload, onSuccess) => onEditTicket(ticketId, payload, (updatedTicket) => {
          setSelectedTicket(updatedTicket);
          onSuccess?.(updatedTicket);
        })}
        ticket={selectedTicket}
      />
    </section>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="strip-card flex-col items-start">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="strip-card">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="text-sm text-slate-600">{value}</span>
    </div>
  );
}

export default ProjectWorkspacePage;
