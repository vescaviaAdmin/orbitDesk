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
  sprintSelection: "",
  status: "open",
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
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDashboardPath = path === "/member" || path === "/member/dashboard";
  const isProjectsPath = path === "/member/projects";
  const isTicketsPath = path === "/member/tickets";
  const isRequestsPath = path === "/member/requests";
  const isDocumentsPath = path === "/member/documents";
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

  const sprintOptions = useMemo(
    () =>
      (selectedProject?.planning || []).flatMap((phase, phaseIndex) =>
        (phase.sprints || []).map((sprint, sprintIndex) => ({
          value: `${phaseIndex}:${sprintIndex}`,
          label: `${phase.name || `Phase ${phaseIndex + 1}`} / ${sprint.name || `Sprint ${sprintIndex + 1}`}`,
        })),
      ),
    [selectedProject],
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
        sprintSelection:
          data.project.planning?.flatMap((phase, phaseIndex) =>
            (phase.sprints || []).map((_, sprintIndex) => `${phaseIndex}:${sprintIndex}`),
          )[0] || "",
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
    if (projectIdFromPath || createTicketProjectId || createRequestProjectId) {
      loadProject(projectIdFromPath || createTicketProjectId || createRequestProjectId);
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
  }, [projectIdFromPath, ticketIdFromPath, createTicketProjectId, createRequestProjectId]);

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

  async function handleTicketSubmit(event) {
    event.preventDefault();

    if (!selectedProject) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const urls = ticketForm.urlsText
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean);

      const data = await raiseTicket(selectedProject._id, {
        title: ticketForm.title,
        description: ticketForm.description,
        assignedTo: ticketForm.assignedTo,
        deadline: ticketForm.deadline,
        sprintSelection: ticketForm.sprintSelection,
        status: ticketForm.status,
        urls,
      });

      setTickets((current) => [data.ticket, ...current]);
      setTicketForm({
        ...emptyTicket,
        assignedTo: selectedProject.members?.[0]?._id || "",
        sprintSelection: sprintOptions[0]?.value || "",
      });
      setMemberSearch("");
      setStatus(data.message);
      routeTo("/member/tickets");
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
            <SidebarLink active={isProjectsPath || Boolean(projectIdFromPath) || Boolean(createTicketProjectId) || Boolean(createRequestProjectId)} icon="02" label="Projects" onClick={() => routeTo("/member/projects")} />
            <SidebarLink active={isTicketsPath || Boolean(ticketIdFromPath)} icon="03" label="Issues" onClick={() => routeTo("/member/tickets")} />
            <SidebarLink active={isRequestsPath} icon="04" label="Sprints / Requests" onClick={() => routeTo("/member/requests")} />
            <SidebarLink active={isDocumentsPath} icon="05" label="Documents" onClick={() => routeTo("/member/documents")} />
          </nav>

          <div className="surface-muted mt-8 p-4">
            <p className="text-sm font-semibold text-slate-900">{session.user?.name || "Workspace member"}</p>
            <p className="muted-text mt-1 text-sm">{session.user?.email || "Delivery team"}</p>
          </div>
        </aside>

        <section className="workspace-main">
          <header className="workspace-header p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow">Member Interface</p>
                <h1 className="hero-title mt-3">Build work visibility like a project board</h1>
                <p className="muted-text mt-3 max-w-3xl text-sm leading-6">
                  Review assigned projects, update ticket status, and open delivery requests without leaving the workspace context.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="primary-button" onClick={() => routeTo("/member/projects")} type="button">
                  Open projects
                </button>
                <button className="secondary-button" onClick={loadHomeData} type="button">
                  Refresh
                </button>
              </div>
            </div>

            {error ? <p className="status-error mt-5">{error}</p> : null}
            {status ? <p className="status-success mt-5">{status}</p> : null}
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Assigned projects" value={projects.length} note="Project workspaces you can access" />
            <MetricCard label="Open tickets" value={tickets.filter((ticket) => ticket.status === "open").length} note="Awaiting active execution" />
            <MetricCard label="In progress" value={tickets.filter((ticket) => ticket.status === "in_progress").length} note="Work currently underway" />
            <MetricCard label="Requests" value={requestsFeed.length} note="Admin-facing requests across projects" />
          </section>

          {isDashboardPath ? <DashboardHome documentsFeed={documentsFeed} requestsFeed={requestsFeed} summary={activeProjectSummary} tickets={tickets} /> : null}
          {isProjectsPath ? <ProjectsPage loading={loading} projects={projects} /> : null}
          {isTicketsPath ? <TicketsPage loading={loading} onStatusChange={handleStatusChange} tickets={tickets} /> : null}
          {isRequestsPath ? <RequestsPage loading={loading} requests={requestsFeed} /> : null}
          {isDocumentsPath ? <DocumentsPage documents={documentsFeed} loading={loading} /> : null}
          {projectIdFromPath ? <ProjectDetail project={selectedProject} projectClient={projectClient} requests={projectRequests} tickets={tickets} /> : null}
          {ticketIdFromPath ? <TicketDetail loading={loading} onBack={() => routeTo("/member/tickets")} onStatusChange={handleStatusChange} ticket={selectedTicket} /> : null}
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
              sprintOptions={sprintOptions}
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

function MetricCard({ label, value, note }) {
  return (
    <article className="metric-card">
      <p className="muted-text text-sm font-semibold">{label}</p>
      <strong className="metric-value">{value}</strong>
      <p className="muted-text mt-2 text-sm">{note}</p>
    </article>
  );
}

function DashboardHome({ documentsFeed, requestsFeed, summary, tickets }) {
  const boardColumns = [
    { key: "open", label: "Backlog" },
    { key: "open", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "review", label: "In Review" },
    { key: "resolved", label: "Done" },
  ];

  const groupedTickets = {
    open: tickets.filter((ticket) => ticket.status === "open"),
    in_progress: tickets.filter((ticket) => ticket.status === "in_progress"),
    review: tickets.filter((ticket) => ticket.status === "review"),
    resolved: tickets.filter((ticket) => ticket.status === "resolved"),
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Project Focus</p>
            <h2 className="section-title mt-3">{summary?.source?.name || "No project assigned"}</h2>
            <p className="muted-text mt-3 text-sm leading-6">
              {summary?.source?.description || "Assigned project details will appear here when a workspace is available."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoStat label="Current phase" value={summary?.currentPhase?.name || "Not set"} />
            <InfoStat label="Current sprint" value={summary?.currentSprint?.name || "Not set"} />
            <InfoStat label="Expected delivery" value={summary?.expected || "Not set"} />
            <InfoStat label="Planned items" value={summary?.planned ?? 0} />
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Board</p>
            <h2 className="section-title mt-3">Kanban overview</h2>
          </div>
        </div>
        <div className="board-scroll mt-6">
          <div className="board-grid">
            {boardColumns.map((column, index) => (
              <div className="kanban-column" key={`${column.label}-${index}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{column.label}</h3>
                  <span className="glass-chip">{groupedTickets[column.key]?.length || 0}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {(groupedTickets[column.key] || []).slice(0, 3).map((ticket) => (
                    <article className="task-card" key={`${column.label}-${ticket._id}`}>
                      <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                      <p className="muted-text mt-2 text-sm">{ticket.description || "No description provided."}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="badge badge-primary">{normalizeStatus(ticket.status)}</span>
                        <span className="muted-text text-xs">{formatDate(ticket.deadline)}</span>
                      </div>
                    </article>
                  ))}
                  {!groupedTickets[column.key]?.length ? <div className="surface-muted p-4 text-sm text-slate-500">No items</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Requests</p>
              <h2 className="section-title mt-3 text-xl">Team collaboration</h2>
            </div>
            <span className="glass-chip">{requestsFeed.length}</span>
          </div>
          <div className="mt-5 space-y-3">
            {requestsFeed.slice(0, 4).map((requestItem) => (
              <article className="surface-muted p-4" key={requestItem._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{requestItem.title}</p>
                    <p className="muted-text mt-1 text-sm">{requestItem.project?.name || "Project"}</p>
                  </div>
                  <span className="badge badge-info">{normalizeStatus(requestItem.status)}</span>
                </div>
                <p className="muted-text mt-3 text-sm">{requestItem.description || "No request details provided."}</p>
              </article>
            ))}
            {!requestsFeed.length ? <EmptyCard copy="No requests raised yet." /> : null}
          </div>
        </section>

        <section className="surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Documents</p>
              <h2 className="section-title mt-3 text-xl">Delivery resources</h2>
            </div>
            <span className="glass-chip">{documentsFeed.length}</span>
          </div>
          <div className="mt-5 space-y-3">
            {documentsFeed.slice(0, 4).map((item) => (
              <article className="surface-muted p-4" key={`${item.project._id}-${item.document.url}`}>
                <p className="font-semibold text-slate-900">{item.document.originalName || "Agreement document"}</p>
                <p className="muted-text mt-1 text-sm">{item.project.name}</p>
                <a className="secondary-button mt-4" href={item.document.url} rel="noreferrer" target="_blank">
                  Open document
                </a>
              </article>
            ))}
            {!documentsFeed.length ? <EmptyCard copy="No documents attached to your projects yet." /> : null}
          </div>
        </section>
      </div>
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
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <article className="surface-muted p-5" key={project._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                <p className="muted-text mt-2 text-sm">{project.description || "No project description provided."}</p>
              </div>
              <span className="badge badge-primary">{normalizeStatus(project.status)}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoStat label="Phases" value={project.planning?.length || 0} />
              <InfoStat label="Sprints" value={(project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0)} />
              <InfoStat label="Planned" value={countPlannedTickets(project.planning)} />
            </div>
            <button className="primary-button mt-5" onClick={() => routeTo(`/member/projects/${project._id}`)} type="button">
              Open project
            </button>
          </article>
        ))}
        {!projects.length ? <EmptyCard copy={loading ? "Loading projects..." : "No assigned projects yet."} /> : null}
      </div>
    </section>
  );
}

function TicketsPage({ loading, onStatusChange, tickets }) {
  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Issues</p>
          <h2 className="section-title mt-3">Execution tickets</h2>
        </div>
        <span className="glass-chip">{tickets.length}</span>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {tickets.map((ticket) => (
          <article className="task-card" key={ticket._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">{ticket.project?.name || "Project"}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{ticket.title}</h3>
              </div>
              <span className="badge badge-primary">{normalizeStatus(ticket.status)}</span>
            </div>
            <p className="muted-text mt-3 text-sm">{ticket.description || "No description provided."}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-900">
                Status
                <select className="input-field" disabled={loading} onChange={(event) => onStatusChange(ticket._id, event.target.value)} value={ticket.status}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="resolved">Done</option>
                </select>
              </label>
              <InfoStat label="Due date" value={formatDate(ticket.deadline)} />
            </div>
            <button className="secondary-button mt-4" onClick={() => routeTo(`/member/tickets/${ticket._id}`)} type="button">
              View detail
            </button>
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
          <button className="secondary-button" onClick={() => routeTo(`/member/projects/${project._id}/requests/new`)} type="button">
            Raise request
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Board summary</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoStat label="Client" value={project.clientEmail || "Not assigned"} />
              <InfoStat label="Expected completion" value={projectExpectedTime(project)} />
              <InfoStat label="Current phase" value={currentPhase?.name || "Not set"} />
              <InfoStat label="Current sprint" value={currentSprint?.name || "Not set"} />
            </div>
          </section>

          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Delivery plan</h3>
              <span className="glass-chip">{countPlannedTickets(project.planning)} planned items</span>
            </div>
            <div className="mt-5 space-y-4">
              {(project.planning || []).map((phase, phaseIndex) => (
                <article className="surface-card p-4" key={`${project._id}-${phaseIndex}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phase {phaseIndex + 1}</p>
                  <h4 className="mt-2 font-semibold text-slate-900">{phase.name || `Phase ${phaseIndex + 1}`}</h4>
                  <p className="muted-text mt-2 text-sm">{phase.outcome || "No phase outcome defined."}</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {(phase.sprints || []).map((sprint, sprintIndex) => (
                      <div className="rounded-xl border border-slate-200 bg-white p-4" key={`${phaseIndex}-${sprintIndex}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-slate-900">{sprint.name || `Sprint ${sprintIndex + 1}`}</span>
                          <span className="badge badge-info">{formatDate(sprint.endDate)}</span>
                        </div>
                        <p className="muted-text mt-2 text-sm">{sprint.outcome || "No sprint outcome defined."}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
              {!project.planning?.length ? <EmptyCard copy="No planning details added yet." /> : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Metadata</h3>
            <div className="mt-4 space-y-3">
              <InfoRow label="Client name" value={projectClient?.name || "Not available"} />
              <InfoRow label="Client email" value={projectClient?.email || project.clientEmail || "Not available"} />
              <InfoRow label="Agreement" value={projectClient?.agreementDocument?.originalName || "No document attached"} />
              <InfoRow label="Requests" value={requests.length} />
              <InfoRow label="Raised tickets" value={projectTicketCount} />
            </div>
          </section>

          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Team</h3>
              <span className="glass-chip">{project.members?.length || 0}</span>
            </div>
            <div className="mt-4 space-y-3">
              {(project.members || []).map((member) => (
                <div className="surface-card flex items-center justify-between gap-3 p-4" key={member._id}>
                  <div>
                    <p className="font-semibold text-slate-900">{member.name}</p>
                    <p className="muted-text text-sm">{member.email}</p>
                  </div>
                  <span className="badge badge-primary">Owner</span>
                </div>
              ))}
              {!project.members?.length ? <EmptyCard copy="No members assigned yet." /> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function TicketDetail({ loading, onBack, onStatusChange, ticket }) {
  if (!ticket) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading ticket...</section>;
  }

  return (
    <section className="surface-card mt-6 p-6">
      <button className="secondary-button" onClick={onBack} type="button">
        Back to tickets
      </button>
      <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="surface-muted p-5">
            <p className="eyebrow">Issue Detail</p>
            <h2 className="section-title mt-3">{ticket.title}</h2>
            <p className="muted-text mt-4 text-sm leading-6">{ticket.description || "No description provided."}</p>
          </section>

          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Comments</h3>
            <div className="empty-state mt-4">
              <p className="text-sm text-slate-600">Comments will appear here when collaborative updates are available.</p>
            </div>
          </section>

          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Subtasks</h3>
            <div className="mt-4 space-y-3">
              {[
                "Clarify implementation notes",
                "Confirm delivery with stakeholders",
                "Attach supporting links",
              ].map((item) => (
                <label className="surface-card flex items-center gap-3 p-4" key={item}>
                  <input type="checkbox" />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Metadata</h3>
            <label className="mt-4 block text-sm font-semibold text-slate-900">
              Status
              <select className="input-field" disabled={loading} onChange={(event) => onStatusChange(ticket._id, event.target.value)} value={ticket.status}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="resolved">Done</option>
              </select>
            </label>
            <div className="mt-4 space-y-3">
              <InfoRow label="Priority" value="Medium" />
              <InfoRow label="Assignee" value={ticket.assignedTo?.name || ticket.assignedTo?.email || "Unassigned"} />
              <InfoRow label="Reporter" value="Member workspace" />
              <InfoRow label="Due date" value={formatDate(ticket.deadline)} />
              <InfoRow label="Sprint" value={ticket.sprint?.sprintName || "Not set"} />
            </div>
          </section>

          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Attachments</h3>
            <div className="mt-4 space-y-3">
              {(ticket.urls || []).map((url) => (
                <a className="secondary-button w-full justify-start" href={url} key={url} rel="noreferrer" target="_blank">
                  {url}
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

function CreateTicketPage({
  assignedMember,
  loading,
  memberSearch,
  onBack,
  onMemberSearch,
  onSelectAssignee,
  onSubmit,
  onTicketChange,
  project,
  searchedMembers,
  sprintOptions,
  ticketForm,
}) {
  if (!project) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading project...</section>;
  }

  return (
    <section className="surface-card mt-6 p-6">
      <button className="secondary-button" onClick={onBack} type="button">
        Back to project
      </button>
      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="surface-muted p-5">
          <p className="eyebrow">Context</p>
          <h2 className="section-title mt-3">Raise ticket for {project.name}</h2>
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

        <form className="surface-muted p-5" onSubmit={onSubmit}>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="title">
            Title
            <input className="input-field" id="title" name="title" onChange={onTicketChange} required value={ticketForm.title} />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="deadline">
            Due date
            <input className="input-field" id="deadline" name="deadline" onChange={onTicketChange} required type="date" value={ticketForm.deadline} />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="status">
            Status
            <select className="input-field" id="status" name="status" onChange={onTicketChange} value={ticketForm.status}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="resolved">Done</option>
            </select>
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="sprintSelection">
            Sprint
            <select className="input-field" id="sprintSelection" name="sprintSelection" onChange={onTicketChange} required value={ticketForm.sprintSelection}>
              <option value="">Select sprint</option>
              {sprintOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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

function InfoStat({ label, value }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="surface-card flex items-center justify-between gap-3 p-4">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="muted-text text-sm text-right">{value}</span>
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
