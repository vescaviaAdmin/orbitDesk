import { useEffect, useMemo, useState } from "react";
import {
  getMemberProject,
  getMemberTicket,
  listMemberProjects,
  listMemberTickets,
  raiseRequest,
  raiseTicket,
  updateMemberTicketStatus,
} from "../../api/member";

const emptyTicket = {
  title: "",
  description: "",
  assignedTo: "",
  deadline: "",
  status: "open",
  priority: "medium",
  type: "task",
  urlsText: "",
};

const emptyRequest = {
  title: "",
  description: "",
};

function routeTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function buildTicketPath(ticketId) {
  return `/member/tickets/${ticketId}`;
}

function buildTicketShareUrl(ticketId) {
  if (typeof window === "undefined") {
    return buildTicketPath(ticketId);
  }

  return new URL(buildTicketPath(ticketId), window.location.origin).toString();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTodayInputValue() {
  return new Date().toISOString().split("T")[0];
}

function resolveCurrentPhase(phases) {
  if (!phases?.length) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    phases.find((phase) => {
      if (!phase.startDate || !phase.endDate) {
        return false;
      }

      const start = new Date(phase.startDate);
      const end = new Date(phase.endDate);
      return start <= today && today <= end;
    }) || phases[0]
  );
}

function resolveCurrentSprint(phase) {
  if (!phase?.sprints?.length) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    phase.sprints.find((sprint) => {
      if (!sprint.startDate || !sprint.endDate) {
        return false;
      }

      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      return start <= today && today <= end;
    }) || phase.sprints[0]
  );
}

function countPlannedTickets(planning = []) {
  return planning.reduce(
    (total, phase) =>
      total +
      (phase.sprints || []).reduce((sprintTotal, sprint) => sprintTotal + (sprint.tickets?.length || 0), 0),
    0,
  );
}

function projectExpectedTime(project) {
  const datedPhases = (project?.planning || []).filter((phase) => phase.endDate);
  if (!datedPhases.length) {
    return "Timeline not set";
  }

  const latestPhase = datedPhases.reduce((latest, phase) =>
    new Date(phase.endDate) > new Date(latest.endDate) ? phase : latest,
  );

  return formatDate(latestPhase.endDate);
}

function normalizeStatus(status) {
  return (status || "open").replaceAll("_", " ");
}

function getProjectTone(status) {
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

function countProjectSprints(project) {
  return (project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0);
}

function MemberDashboard() {
  const session = JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
  const [path, setPath] = useState(window.location.pathname);
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [projectClient, setProjectClient] = useState(null);
  const [projectRequests, setProjectRequests] = useState([]);
  const [projectDirectory, setProjectDirectory] = useState([]);
  const [ticketForm, setTicketForm] = useState(emptyTicket);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [memberSearch, setMemberSearch] = useState("");
  const [shareTicket, setShareTicket] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDashboardPath = path === "/member" || path === "/member/dashboard";
  const isProjectsPath = path === "/member/projects";
  const isTicketsPath = path === "/member/tickets";
  const isRequestsPath = path === "/member/requests";
  const isDocumentsPath = path === "/member/documents";
  const projectTicketsPathId = path.match(/^\/member\/projects\/([^/]+)\/tickets$/)?.[1] || "";
  const projectIdFromPath = path.match(/^\/member\/projects\/([^/]+)$/)?.[1] || "";
  const ticketIdFromPath = path.match(/^\/member\/tickets\/([^/]+)$/)?.[1] || "";
  const createTicketProjectId = path.match(/^\/member\/projects\/([^/]+)\/tickets\/new$/)?.[1] || "";
  const createRequestProjectId = path.match(/^\/member\/projects\/([^/]+)\/requests\/new$/)?.[1] || "";

  const searchedProjectMembers = useMemo(() => {
    const members = selectedProject?.members || [];
    const search = memberSearch.trim().toLowerCase();
    const source = search
      ? members.filter((member) => [member.name, member.email].some((value) => value.toLowerCase().includes(search)))
      : members;

    return source.slice(0, 10);
  }, [memberSearch, selectedProject]);

  const assignedMember = useMemo(
    () => (selectedProject?.members || []).find((member) => member._id === ticketForm.assignedTo),
    [selectedProject, ticketForm.assignedTo],
  );

  const requestsFeed = useMemo(
    () =>
      projectDirectory.flatMap((entry) =>
        (entry.requests || []).map((requestItem) => ({
          ...requestItem,
          project: entry.project,
        })),
      ),
    [projectDirectory],
  );

  const documentsFeed = useMemo(
    () =>
      projectDirectory
        .filter((entry) => entry.client?.agreementDocument?.url)
        .map((entry) => ({
          project: entry.project,
          client: entry.client,
          document: entry.client.agreementDocument,
        })),
    [projectDirectory],
  );

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  async function loadHomeData() {
    setLoading(true);
    setError("");

    try {
      const [projectData, ticketData] = await Promise.all([listMemberProjects(), listMemberTickets()]);
      setProjects(projectData.projects || []);
      setTickets(ticketData.tickets || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProject(projectId) {
    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await getMemberProject(projectId);
      setSelectedProject(data.project);
      setProjectClient(data.client || null);
      setProjectRequests(data.requests || []);
      setTicketForm({
        ...emptyTicket,
        assignedTo: data.project.members?.[0]?._id || "",
      });
      setRequestForm(emptyRequest);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTicket(ticketId) {
    setLoading(true);
    setError("");

    try {
      const data = await getMemberTicket(ticketId);
      setSelectedTicket(data.ticket);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectDirectory() {
    if (!projects.length) {
      setProjectDirectory([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const details = await Promise.all(projects.map((project) => getMemberProject(project._id)));
      setProjectDirectory(
        details.map((detail) => ({
          client: detail.client || null,
          project: detail.project,
          requests: detail.requests || [],
        })),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    if (projectIdFromPath || projectTicketsPathId || createTicketProjectId || createRequestProjectId) {
      loadProject(projectIdFromPath || projectTicketsPathId || createTicketProjectId || createRequestProjectId);
      return;
    }

    if (ticketIdFromPath) {
      loadTicket(ticketIdFromPath);
      return;
    }

    setSelectedProject(null);
    setSelectedTicket(null);
    setProjectClient(null);
    setProjectRequests([]);
    setTicketForm(emptyTicket);
    setRequestForm(emptyRequest);
    setMemberSearch("");
  }, [projectIdFromPath, projectTicketsPathId, ticketIdFromPath, createTicketProjectId, createRequestProjectId]);

  useEffect(() => {
    if (isDashboardPath || isRequestsPath || isDocumentsPath) {
      loadProjectDirectory();
    }
  }, [isDashboardPath, isRequestsPath, isDocumentsPath, projects]);

  function updateTicket(event) {
    const { name, value } = event.target;
    setTicketForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateRequest(event) {
    const { name, value } = event.target;
    setRequestForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyTicketUpdate(updatedTicket) {
    setTickets((current) => current.map((ticket) => (ticket._id === updatedTicket._id ? { ...ticket, ...updatedTicket } : ticket)));
    setSelectedTicket((current) => (current?._id === updatedTicket._id ? { ...current, ...updatedTicket } : current));
  }

  function openShareTicket(ticket, options = {}) {
    if (!ticket?._id) {
      return;
    }

    setCopyStatus("");
    setShareTicket({
      closePath: options.closePath || "",
      title: ticket.title || "Ticket",
      url: buildTicketShareUrl(ticket._id),
    });
  }

  function closeShareTicket() {
    setShareTicket(null);
    setCopyStatus("");
  }

  async function handleCopyTicketLink() {
    if (!shareTicket?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareTicket.url);
      setCopyStatus("Link copied");
    } catch (copyError) {
      setCopyStatus("Copy failed");
    }
  }

  async function handleTicketSubmit(event) {
    event.preventDefault();

    if (!selectedProject) {
      setError("Select a project before raising a ticket.");
      return;
    }

    const title = ticketForm.title.trim();
    const description = ticketForm.description.trim();
    const urls = ticketForm.urlsText
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (!title) {
      setError("Ticket title is required.");
      return;
    }

    if (!ticketForm.assignedTo) {
      setError("Select an assignee from the project members.");
      return;
    }

    if (!ticketForm.deadline) {
      setError("Due date is required.");
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await raiseTicket(selectedProject._id, {
        title,
        description,
        assignedTo: ticketForm.assignedTo,
        deadline: ticketForm.deadline,
        status: ticketForm.status,
        priority: ticketForm.priority,
        type: ticketForm.type,
        urls,
      });

      setTickets((current) => [data.ticket, ...current]);
      setTicketForm({
        ...emptyTicket,
        assignedTo: selectedProject.members?.[0]?._id || "",
      });
      setMemberSearch("");
      setStatus(data.message);
      openShareTicket(data.ticket, {
        closePath: `/member/projects/${selectedProject._id}/tickets`,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();

    if (!selectedProject) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await raiseRequest(selectedProject._id, {
        title: requestForm.title,
        description: requestForm.description,
      });

      setProjectRequests((current) => [data.request, ...current]);
      setRequestForm(emptyRequest);
      setStatus(data.message);
      routeTo("/member/requests");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(ticketId, nextStatus) {
    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await updateMemberTicketStatus(ticketId, nextStatus);
      applyTicketUpdate(data.ticket);
      setStatus(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const activeProjectSummary = useMemo(() => {
    if (!projects.length) {
      return null;
    }

    const source = selectedProject || projects[0];
    const currentPhase = resolveCurrentPhase(source.planning || []);
    const currentSprint = resolveCurrentSprint(currentPhase);
    const relatedTickets = tickets.filter((ticket) => ticket.project?._id === source._id);

    return {
      source,
      currentPhase,
      currentSprint,
      relatedTickets,
      planned: countPlannedTickets(source.planning),
      expected: projectExpectedTime(source),
    };
  }, [projects, selectedProject, tickets]);
  const projectStatusCounts = useMemo(
    () =>
      projects.reduce(
        (counts, project) => {
          const tone = getProjectTone(project.status);
          if (tone === "completed") {
            return { ...counts, completed: counts.completed + 1 };
          }

          if (tone === "assigned") {
            return { ...counts, assigned: counts.assigned + 1 };
          }

          return { ...counts, pending: counts.pending + 1 };
        },
        { assigned: 0, completed: 0, pending: 0 },
      ),
    [projects],
  );

  return (
    <main className="workspace-shell">
      <div className="workspace-layout">
        <aside className="workspace-sidebar p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
              OD
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">OrbitDesk Member</p>
              <p className="muted-text text-xs">Projects, tickets, delivery flow</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            <SidebarLink active={isDashboardPath} icon="01" label="Dashboard" onClick={() => routeTo("/member/dashboard")} />
            <SidebarLink active={isProjectsPath || Boolean(projectIdFromPath) || Boolean(projectTicketsPathId) || Boolean(createTicketProjectId) || Boolean(createRequestProjectId)} icon="02" label="Projects" onClick={() => routeTo("/member/projects")} />
            <SidebarLink active={isTicketsPath || Boolean(ticketIdFromPath)} icon="03" label="Issues" onClick={() => routeTo("/member/tickets")} />
            <SidebarLink active={isRequestsPath} icon="04" label="Requests" onClick={() => routeTo("/member/requests")} />
            <SidebarLink active={isDocumentsPath} icon="05" label="Documents" onClick={() => routeTo("/member/documents")} />
          </nav>

          <div className="surface-muted mt-8 p-4">
            <p className="text-sm font-semibold text-slate-900">{session.user?.name || "Workspace member"}</p>
            <p className="muted-text mt-1 text-sm">{session.user?.email || "Delivery team"}</p>
          </div>
        </aside>

        <section className="workspace-main">
          {isDashboardPath ? (
            <header className="workspace-header p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Hello, {session.user?.name || "Workspace member"}</h1>
                  <p className="muted-text mt-1 text-sm">Here is what is moving across your projects today.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="primary-button" onClick={() => routeTo("/member/projects")} type="button">
                    Open projects
                  </button>
                  <button aria-label="Sync dashboard" className="icon-button" onClick={loadHomeData} title="Sync dashboard" type="button">
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <path d="M20 7v5h-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      <path d="M4 17v-5h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      <path d="M18.2 9A7 7 0 0 0 6.4 6.9L4 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      <path d="M5.8 15A7 7 0 0 0 17.6 17.1L20 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  </button>
                </div>
              </div>

              {error ? <p className="status-error mt-5">{error}</p> : null}
              {status ? <p className="status-success mt-5">{status}</p> : null}
            </header>
          ) : (
            <>
              {error ? <p className="status-error mt-6">{error}</p> : null}
              {status ? <p className="status-success mt-6">{status}</p> : null}
            </>
          )}

          {isDashboardPath ? (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Pending projects" tone="pending" value={projectStatusCounts.pending} note="Waiting for kickoff or planning" onClick={() => routeTo("/member/projects")} />
              <MetricCard label="Assigned projects" tone="assigned" value={projectStatusCounts.assigned} note="Active workspaces in delivery" onClick={() => routeTo("/member/projects")} />
              <MetricCard label="Completed projects" tone="completed" value={projectStatusCounts.completed} note="Delivered workspaces" onClick={() => routeTo("/member/projects")} />
              <MetricCard label="Open tickets" value={tickets.filter((ticket) => ticket.status === "open").length} note="Awaiting active execution" onClick={() => routeTo("/member/tickets")} />
            </section>
          ) : null}

          {isDashboardPath ? <DashboardHome documentsFeed={documentsFeed} requestsFeed={requestsFeed} summary={activeProjectSummary} tickets={tickets} /> : null}
          {isProjectsPath ? <ProjectsPage loading={loading} projects={projects} /> : null}
          {projectTicketsPathId ? <TicketsPage loading={loading} onStatusChange={handleStatusChange} tickets={tickets.filter((ticket) => ticket.project?._id === projectTicketsPathId)} title={selectedProject ? `${selectedProject.name} Tickets` : "Project Tickets"} /> : null}
          {isTicketsPath ? <TicketsPage loading={loading} onStatusChange={handleStatusChange} tickets={tickets} /> : null}
          {isRequestsPath ? <RequestsPage loading={loading} requests={requestsFeed} /> : null}
          {isDocumentsPath ? <DocumentsPage documents={documentsFeed} loading={loading} /> : null}
          {projectIdFromPath ? <ProjectDetail project={selectedProject} projectClient={projectClient} requests={projectRequests} tickets={tickets} /> : null}
          {ticketIdFromPath ? (
            <TicketDetail
              loading={loading}
              onBack={() => routeTo("/member/tickets")}
              onShare={() => openShareTicket(selectedTicket)}
              onStatusChange={handleStatusChange}
              ticket={selectedTicket}
            />
          ) : null}
          {createTicketProjectId ? (
            <CreateTicketPage
              assignedMember={assignedMember}
              loading={loading}
              memberSearch={memberSearch}
              onBack={() => routeTo(`/member/projects/${createTicketProjectId}`)}
              onMemberSearch={setMemberSearch}
              onSelectAssignee={(memberId) => setTicketForm((current) => ({ ...current, assignedTo: memberId }))}
              onSubmit={handleTicketSubmit}
              onTicketChange={updateTicket}
              project={selectedProject}
              searchedMembers={searchedProjectMembers}
              ticketForm={ticketForm}
            />
          ) : null}
          {createRequestProjectId ? (
            <CreateRequestPage
              loading={loading}
              onBack={() => routeTo(`/member/projects/${createRequestProjectId}`)}
              onRequestChange={updateRequest}
              onSubmit={handleRequestSubmit}
              project={selectedProject}
              requestForm={requestForm}
            />
          ) : null}
        </section>
      </div>

      {shareTicket ? (
        <ShareTicketModal
          copyStatus={copyStatus}
          onClose={() => {
            const closePath = shareTicket.closePath;
            closeShareTicket();
            if (closePath) {
              routeTo(closePath);
            }
          }}
          onCopy={handleCopyTicketLink}
          onOpen={() => {
            const ticketPath = new URL(shareTicket.url).pathname;
            closeShareTicket();
            routeTo(ticketPath);
          }}
          ticket={shareTicket}
        />
      ) : null}
    </main>
  );
}

function SidebarLink({ active, icon, label, onClick }) {
  return (
    <button className={`sidebar-link w-full justify-between ${active ? "sidebar-link-active" : ""}`} onClick={onClick} type="button">
      <span className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{icon}</span>
        {label}
      </span>
    </button>
  );
}

function MetricCard({ label, value, note, onClick, tone = "neutral" }) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag className={`metric-card metric-card-${tone} w-full text-left ${onClick ? "cursor-pointer hover:shadow-md" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <div className="flex items-center gap-2">
        <span className={`status-dot status-dot-${tone}`} />
        <p className="muted-text text-sm font-semibold">{label}</p>
      </div>
      <strong className="mt-2 block text-2xl font-bold tracking-[-0.04em] text-slate-900">{value}</strong>
      <p className="muted-text mt-2 text-sm">{note}</p>
    </Tag>
  );
}

function DashboardHome({ documentsFeed, requestsFeed, summary, tickets }) {
  return (
    <div className="mt-6 space-y-6">
      <section className="surface-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Current Focus</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-900">{summary?.source?.name || "No project assigned"}</h2>
            <p className="muted-text mt-3 text-sm leading-6">
              {summary?.source?.description || "Assigned project details will appear here when a workspace is available."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoStat label="Expected delivery" value={summary?.expected || "Not set"} onClick={summary?.source?._id ? () => routeTo(`/member/projects/${summary.source._id}`) : undefined} />
            <InfoStat label="Planned items" value={summary?.planned ?? 0} onClick={summary?.source?._id ? () => routeTo(`/member/projects/${summary.source._id}`) : undefined} />
            <InfoStat label="Open tickets" value={tickets.filter((ticket) => ticket.status === "open").length} onClick={() => routeTo("/member/tickets")} />
            <InfoStat label="Requests" value={requestsFeed.length} onClick={() => routeTo("/member/requests")} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectsPage({ loading, projects }) {
  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Projects</p>
          <h2 className="section-title mt-3">Assigned workspaces</h2>
        </div>
        <span className="glass-chip">{projects.length}</span>
      </div>
      {projects.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Timeline</th>
                <th>Phases</th>
                <th>Sprints</th>
                <th>Planned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const tone = getProjectTone(project.status);

                return (
                  <tr className={`project-row project-row-${tone}`} key={project._id}>
                    <td>
                      <div className="flex min-w-[240px] items-start gap-3">
                        <span className={`status-dot status-dot-${tone} mt-1.5`} />
                        <div>
                          <p className="font-semibold text-slate-900">{project.name}</p>
                          <p className="muted-text mt-1 line-clamp-2 text-sm">{project.description || "No project description provided."}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill status-pill-${tone}`}>{normalizeStatus(project.status)}</span>
                    </td>
                    <td>{projectExpectedTime(project)}</td>
                    <td>{project.planning?.length || 0}</td>
                    <td>{countProjectSprints(project)}</td>
                    <td>{countPlannedTickets(project.planning)}</td>
                    <td>
                      <div className="flex min-w-[190px] flex-wrap gap-2">
                        <button className="secondary-button px-3 py-2" onClick={() => routeTo(`/member/projects/${project._id}`)} type="button">
                          Details
                        </button>
                        <button className="secondary-button px-3 py-2" onClick={() => routeTo(`/member/projects/${project._id}/tickets`)} type="button">
                          Tickets
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyCard copy={loading ? "Loading projects..." : "No assigned projects yet."} />
      )}
    </section>
  );
}

function TicketsPage({ loading, onStatusChange, tickets, title = "Execution tickets" }) {
  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Issues</p>
          <h2 className="section-title mt-3">{title}</h2>
        </div>
        <span className="glass-chip">{tickets.length}</span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tickets.map((ticket) => (
          <article className="task-card" key={ticket._id}>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-blue-700">{ticket.project?.name || "Project"}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{ticket.title}</h3>
                </div>
                <span className="badge badge-primary">{normalizeStatus(ticket.status)}</span>
              </div>
              <p className="muted-text text-sm leading-5">{ticket.description || "No description provided."}</p>
              <div className="grid gap-2">
                <InfoStat label="Due date" value={formatDate(ticket.deadline)} />
              </div>
              <label className="text-sm font-semibold text-slate-900">
                Status
                <select className="input-field" disabled={loading} onChange={(event) => onStatusChange(ticket._id, event.target.value)} value={ticket.status}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Done</option>
                </select>
              </label>
              <div className="flex justify-end">
                <button className="secondary-button" onClick={() => routeTo(`/member/tickets/${ticket._id}`)} type="button">
                  View detail
                </button>
              </div>
            </div>
          </article>
        ))}
        {!tickets.length ? <EmptyCard copy={loading ? "Loading tickets..." : "No assigned tickets yet."} /> : null}
      </div>
    </section>
  );
}

function RequestsPage({ loading, requests }) {
  return (
    <section className="surface-card mt-6 p-6">
      <p className="eyebrow">Requests</p>
      <h2 className="section-title mt-3">Team coordination feed</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {requests.map((requestItem) => (
          <article className="surface-muted p-5" key={requestItem._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{requestItem.title}</h3>
                <p className="muted-text mt-1 text-sm">{requestItem.project?.name || "Project"}</p>
              </div>
              <span className="badge badge-info">{normalizeStatus(requestItem.status)}</span>
            </div>
            <p className="muted-text mt-3 text-sm">{requestItem.description || "No details provided."}</p>
          </article>
        ))}
        {!requests.length ? <EmptyCard copy={loading ? "Loading requests..." : "No requests raised yet."} /> : null}
      </div>
    </section>
  );
}

function DocumentsPage({ documents, loading }) {
  return (
    <section className="surface-card mt-6 p-6">
      <p className="eyebrow">Documents</p>
      <h2 className="section-title mt-3">Project resources</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {documents.map((item) => (
          <article className="surface-muted p-5" key={`${item.project._id}-${item.document.url}`}>
            <p className="font-semibold text-slate-900">{item.document.originalName || "Agreement document"}</p>
            <p className="muted-text mt-1 text-sm">{item.project.name}</p>
            <a className="primary-button mt-4" href={item.document.url} rel="noreferrer" target="_blank">
              Open document
            </a>
          </article>
        ))}
        {!documents.length ? <EmptyCard copy={loading ? "Loading documents..." : "No documents attached to your projects yet."} /> : null}
      </div>
    </section>
  );
}

function ProjectDetail({ project, projectClient, requests, tickets }) {
  if (!project) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading project...</section>;
  }

  const currentPhase = resolveCurrentPhase(project.planning || []);
  const currentSprint = resolveCurrentSprint(currentPhase);
  const projectTicketCount = tickets.filter((ticket) => ticket.project?._id === project._id).length;
  const projectDocuments = projectClient?.agreementDocument?.url ? [projectClient.agreementDocument] : [];

  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button className="secondary-button" onClick={() => routeTo("/member/projects")} type="button">
            Back to projects
          </button>
          <p className="eyebrow mt-5">Project Detail</p>
          <h2 className="section-title mt-3">{project.name}</h2>
          <p className="muted-text mt-3 max-w-3xl text-sm leading-6">{project.description || "No project description provided."}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button className="primary-button" onClick={() => routeTo(`/member/projects/${project._id}/tickets/new`)} type="button">
            Raise ticket
          </button>
          <button className="secondary-button" onClick={() => routeTo(`/member/projects/${project._id}/tickets`)} type="button">
            Open tickets
          </button>
          <button className="secondary-button" onClick={() => routeTo(`/member/projects/${project._id}/requests/new`)} type="button">
            Raise request
          </button>
        </div>
      </div>

      <div className="mt-6 detail-layout">
        <div className="detail-main-stack">
          <section className="surface-muted p-5">
            <h3 className="compact-panel-title">Project summary</h3>
            <p className="muted-text mt-3 text-sm leading-6">{project.description || "No project description provided."}</p>
            <div className="strip-grid mt-4">
              <StripStat label="Status" value={normalizeStatus(project.status)} />
              <StripStat label="Client" value={projectClient?.name || project.clientEmail || "Not assigned"} />
              <StripStat label="Expected" value={projectExpectedTime(project)} />
              <StripStat label="Phase" value={currentPhase?.name || "Not set"} />
              <StripStat label="Sprint" value={currentSprint?.name || "Not set"} />
              <StripStat label="Tickets" value={projectTicketCount} />
              <StripStat label="Requests" value={requests.length} />
              <StripStat label="Members" value={project.members?.length || 0} />
              <StripStat label="Agreement" value={projectDocuments.length ? "Attached" : "Missing"} />
            </div>
          </section>

          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="compact-panel-title">Delivery plan</h3>
              <span className="glass-chip">{countPlannedTickets(project.planning)} planned items</span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {(project.planning || []).map((phase, phaseIndex) => (
                <article className="surface-card p-4" key={`${project._id}-${phaseIndex}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phase {phaseIndex + 1}</p>
                  <h4 className="mt-2 text-sm font-semibold text-slate-900">{phase.name || `Phase ${phaseIndex + 1}`}</h4>
                  <p className="muted-text mt-2 text-sm leading-5">{phase.outcome || "No phase outcome defined."}</p>
                  <div className="mt-4 space-y-2">
                    {(phase.sprints || []).map((sprint, sprintIndex) => (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-3" key={`${phaseIndex}-${sprintIndex}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">{sprint.name || `Sprint ${sprintIndex + 1}`}</span>
                          <span className="badge badge-info">{formatDate(sprint.endDate)}</span>
                        </div>
                        <p className="muted-text mt-2 text-sm leading-5">{sprint.outcome || "No sprint outcome defined."}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
              {!project.planning?.length ? <EmptyCard copy="No planning details added yet." /> : null}
            </div>
          </section>
        </div>

        <aside className="detail-side-stack">
          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="compact-panel-title">Resources</h3>
              <span className="glass-chip">{projectDocuments.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {projectDocuments.map((document) => (
                <a className="surface-card block p-4 hover:border-violet-200" href={document.url} key={document.url} rel="noreferrer" target="_blank">
                  <p className="font-semibold text-slate-900">{document.originalName || "Agreement document"}</p>
                  <p className="muted-text mt-1 text-sm">Open client document</p>
                </a>
              ))}
              {!projectDocuments.length ? <EmptyCard copy="No project documents attached yet." /> : null}
            </div>
          </section>

          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="compact-panel-title">Quick actions</h3>
              <span className="glass-chip">{project.members?.length || 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              <button className="secondary-button w-full justify-start" onClick={() => routeTo(`/member/projects/${project._id}/tickets`)} type="button">
                View project tickets
              </button>
              <button className="secondary-button w-full justify-start" onClick={() => routeTo(`/member/projects/${project._id}/requests/new`)} type="button">
                Create request
              </button>
              <button className="secondary-button w-full justify-start" onClick={() => routeTo(`/member/projects/${project._id}/tickets/new`)} type="button">
                Create ticket
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function TicketDetail({ loading, onBack, onShare, onStatusChange, ticket }) {
  if (!ticket) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading ticket...</section>;
  }

  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button className="secondary-button" onClick={onBack} type="button">
          Back to tickets
        </button>
        <button className="secondary-button" onClick={onShare} type="button">
          Share
        </button>
      </div>
      <div className="mt-5 detail-layout">
        <div className="detail-main-stack">
          <section className="surface-muted p-5">
            <p className="eyebrow">Issue Detail</p>
            <h2 className="section-title mt-3">{ticket.title}</h2>
            <p className="muted-text mt-4 text-sm leading-6">{ticket.description || "No description provided."}</p>
            <div className="strip-grid mt-4">
              <StripStat label="Status" value={normalizeStatus(ticket.status)} />
              <StripStat label="Assignee" value={ticket.assignedTo?.name || ticket.assignedTo?.email || "Unassigned"} />
              <StripStat label="Due" value={formatDate(ticket.deadline)} />
              <StripStat label="Sprint" value={ticket.sprint?.sprintName || "Not set"} />
              <StripStat label="Project" value={ticket.project?.name || "-"} />
              <StripStat label="Reporter" value="Member workspace" />
            </div>
          </section>

          <section className="surface-muted p-5">
            <h3 className="compact-panel-title">Comments</h3>
            <div className="empty-state mt-4">
              <p className="text-sm text-slate-600">Comments will appear here when collaborative updates are available.</p>
            </div>
          </section>
        </div>

        <aside className="detail-side-stack">
          <section className="surface-muted p-5">
            <h3 className="compact-panel-title">Status</h3>
            <label className="mt-4 block text-sm font-semibold text-slate-900">
              Status
              <select className="input-field" disabled={loading} onChange={(event) => onStatusChange(ticket._id, event.target.value)} value={ticket.status}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Done</option>
              </select>
            </label>
          </section>

          <section className="surface-muted p-5">
            <h3 className="compact-panel-title">Documents</h3>
            <div className="mt-4 space-y-3">
              {(ticket.urls || []).map((url) => (
                <a className="surface-card block p-4 hover:border-violet-200" href={url} key={url} rel="noreferrer" target="_blank">
                  <p className="font-semibold text-slate-900">Attachment link</p>
                  <p className="muted-text mt-1 break-all text-sm">{url}</p>
                </a>
              ))}
              {!ticket.urls?.length ? <EmptyCard copy="No attachments added to this issue yet." /> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function CreateTicketPage({ assignedMember, loading, memberSearch, onBack, onMemberSearch, onSelectAssignee, onSubmit, onTicketChange, project, searchedMembers, ticketForm }) {
  if (!project) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading project...</section>;
  }

  return (
    <section className="surface-card mt-6 p-6">
      <button className="secondary-button" onClick={onBack} type="button">
        Back to project
      </button>
      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form className="surface-muted p-5" onSubmit={onSubmit}>
          <p className="eyebrow">Raise Ticket</p>
          <h2 className="section-title mt-3">Raise ticket for {project.name}</h2>
          <p className="muted-text mt-3 text-sm leading-6">Capture the issue clearly, assign the right owner, and keep the ticket ready for immediate action.</p>

          <label className="block text-sm font-semibold text-slate-900" htmlFor="title">
            Title
            <input className="input-field" id="title" name="title" onChange={onTicketChange} placeholder="Summarize the issue clearly" required value={ticketForm.title} />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="deadline">
            Due date
            <input className="input-field" id="deadline" min={getTodayInputValue()} name="deadline" onChange={onTicketChange} required type="date" value={ticketForm.deadline} />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-900" htmlFor="status">
              Status
              <select className="input-field" id="status" name="status" onChange={onTicketChange} value={ticketForm.status}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Done</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-900" htmlFor="priority">
              Priority
              <select className="input-field" id="priority" name="priority" onChange={onTicketChange} value={ticketForm.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-900" htmlFor="type">
              Type
              <select className="input-field" id="type" name="type" onChange={onTicketChange} value={ticketForm.type}>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="description">
            Description
            <textarea className="input-field min-h-28" id="description" name="description" onChange={onTicketChange} value={ticketForm.description} />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="urlsText">
            Links
            <textarea className="input-field min-h-24" id="urlsText" name="urlsText" onChange={onTicketChange} placeholder="One link per line" value={ticketForm.urlsText} />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="memberSearch">
            Assignee
            <input className="input-field" id="memberSearch" onChange={(event) => onMemberSearch(event.target.value)} placeholder="Search project members" value={memberSearch} />
          </label>
          {assignedMember ? <p className="badge badge-primary mt-3">Assigned to {assignedMember.name}</p> : null}

          <div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {searchedMembers.map((member) => (
              <button className="flex w-full items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-left last:border-b-0" key={member._id} onClick={() => onSelectAssignee(member._id)} type="button">
                <span>
                  <strong className="block text-slate-900">{member.name}</strong>
                  <span className="muted-text text-sm">{member.email}</span>
                </span>
                <span className={`badge ${ticketForm.assignedTo === member._id ? "badge-primary" : "badge-info"}`}>
                  {ticketForm.assignedTo === member._id ? "Selected" : "Assign"}
                </span>
              </button>
            ))}
          </div>

          <button className="primary-button mt-5 w-full" disabled={loading} type="submit">
            {loading ? "Submitting..." : "Create ticket"}
          </button>
        </form>

        <section className="surface-muted p-5">
          <p className="eyebrow">Context</p>
          <h2 className="section-title mt-3">Project context</h2>
          <div className="mt-5 space-y-4">
            {(project.planning || []).map((phase, phaseIndex) => (
              <article className="surface-card p-4" key={`${project._id}-${phaseIndex}`}>
                <h3 className="font-semibold text-slate-900">{phase.name || `Phase ${phaseIndex + 1}`}</h3>
                <p className="muted-text mt-2 text-sm">{phase.outcome || "No phase outcome defined."}</p>
              </article>
            ))}
            {!project.planning?.length ? <EmptyCard copy="No planning details added yet for this project." /> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function CreateRequestPage({ loading, onBack, onRequestChange, onSubmit, project, requestForm }) {
  if (!project) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading project...</section>;
  }

  return (
    <section className="surface-card mt-6 p-6">
      <button className="secondary-button" onClick={onBack} type="button">
        Back to project
      </button>
      <form className="surface-muted mt-5 p-5" onSubmit={onSubmit}>
        <p className="eyebrow">Team Collaboration</p>
        <h2 className="section-title mt-3">Raise request for {project.name}</h2>

        <label className="mt-5 block text-sm font-semibold text-slate-900" htmlFor="request-title">
          Title
          <input className="input-field" id="request-title" name="title" onChange={onRequestChange} required value={requestForm.title} />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="request-description">
          Description
          <textarea className="input-field min-h-32" id="request-description" name="description" onChange={onRequestChange} required value={requestForm.description} />
        </label>

        <button className="primary-button mt-5 w-full" disabled={loading} type="submit">
          {loading ? "Submitting..." : "Create request"}
        </button>
      </form>
    </section>
  );
}

function ShareTicketModal({ copyStatus, onClose, onCopy, onOpen, ticket }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="surface-card w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Share Ticket</p>
            <h2 className="section-title mt-3">Share {ticket.title}</h2>
            <p className="muted-text mt-3 text-sm leading-6">Copy this direct ticket link or open the ticket detail page.</p>
          </div>
          <button aria-label="Close share ticket dialog" className="icon-button" onClick={onClose} type="button">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-900" htmlFor="share-ticket-link">
          Ticket link
          <input className="input-field" id="share-ticket-link" readOnly value={ticket.url} />
        </label>

        {copyStatus ? <p className="muted-text mt-3 text-sm">{copyStatus}</p> : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
          <button className="secondary-button" onClick={onOpen} type="button">
            Open ticket
          </button>
          <button className="primary-button" onClick={onCopy} type="button">
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoStat({ label, value, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`surface-card w-full p-3 text-left ${onClick ? "cursor-pointer hover:border-violet-200 hover:shadow-md" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </Tag>
  );
}

function StripStat({ label, value }) {
  return (
    <div className="strip-card flex-col items-start">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyCard({ copy }) {
  return (
    <div className="empty-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">
        OD
      </div>
      <p className="mt-4 text-sm text-slate-700">{copy}</p>
    </div>
  );
}

export default MemberDashboard;
