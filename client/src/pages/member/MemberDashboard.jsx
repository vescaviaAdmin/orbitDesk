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

  const activePhase = phases.find((phase) => {
    if (!phase.startDate || !phase.endDate) {
      return false;
    }

    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    return start <= today && today <= end;
  });

  return activePhase || phases[0];
}

function resolveCurrentSprint(phase) {
  if (!phase?.sprints?.length) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSprint = phase.sprints.find((sprint) => {
    if (!sprint.startDate || !sprint.endDate) {
      return false;
    }

    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    return start <= today && today <= end;
  });

  return activeSprint || phase.sprints[0];
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
          label: `${phase.name || `Phase ${phaseIndex + 1}`} -> ${sprint.name || `Sprint ${sprintIndex + 1}`}`,
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

  const dashboardItems = [
    {
      label: "Projects",
      value: projects.length,
      text: "Open assigned projects and move into project-level actions.",
      buttonLabel: "See all projects",
      onClick: () => routeTo("/member/projects"),
    },
    {
      label: "Documents",
      value: documentsFeed.length,
      text: "Open agreements and attached project files from their own page.",
      buttonLabel: "See all documents",
      onClick: () => routeTo("/member/documents"),
    },
    {
      label: "Requests",
      value: requestsFeed.length,
      text: "Review admin-facing requests on a separate page.",
      buttonLabel: "See all requests",
      onClick: () => routeTo("/member/requests"),
    },
    {
      label: "Tickets",
      value: tickets.length,
      text: "Track your tickets and update status from the tickets page.",
      buttonLabel: "See all tickets",
      onClick: () => routeTo("/member/tickets"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-5 py-8 text-[#17201c]">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4b5d8c]">Member Interface</p>
            <h1 className="mt-3 text-4xl font-bold">Hello, {session.user?.name || "member"}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {!isDashboardPath ? (
              <button
                className="h-11 rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold"
                onClick={() => routeTo("/member/dashboard")}
                type="button"
              >
                Dashboard
              </button>
            ) : null}
            <button className="h-11 rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold" onClick={loadHomeData} type="button">
              Refresh
            </button>
          </div>
        </div>

        {error ? <p className="mt-5 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}
        {status ? <p className="mt-5 rounded-md bg-[#e8f5eb] px-3 py-2 text-sm text-[#1b6b3a]">{status}</p> : null}

        {isDashboardPath ? <DashboardHome items={dashboardItems} /> : null}
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
    </main>
  );
}

function DashboardHome({ items }) {
  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-2 text-sm text-[#596274]">
          This first page only keeps navigation. Open projects, documents, requests, or tickets from the buttons below.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article className="rounded-2xl border border-[#d8dde5] bg-[#fbfcfe] p-5 shadow-sm" key={item.label}>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4b5d8c]">{item.label}</p>
            <strong className="mt-3 block text-4xl">{item.value}</strong>
            <p className="mt-3 min-h-16 text-sm leading-6 text-[#596274]">{item.text}</p>
            <button className="mt-5 h-11 w-full rounded-md bg-[#243c5a] px-4 text-sm font-semibold text-white" onClick={item.onClick} type="button">
              {item.buttonLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectsPage({ loading, projects }) {
  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="mt-2 text-sm text-[#596274]">Open a project from the compact list below.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {projects.map((project) => (
          <div className="flex flex-col gap-3 rounded-xl border border-[#e3e8f0] bg-[#fbfcfe] p-4 sm:flex-row sm:items-center sm:justify-between" key={project._id}>
            <button
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-left transition hover:border-[#4b5d8c]"
              onClick={() => routeTo(`/member/projects/${project._id}`)}
              type="button"
            >
              <span className="rounded-md bg-[#eef1f7] px-2 py-1 text-xs font-semibold capitalize text-[#4b5d8c]">{project.status}</span>
              <span className="min-w-0">
                <strong className="block truncate">{project.name}</strong>
                <span className="block truncate text-sm text-[#596274]">{project.clientEmail || "No client assigned"}</span>
              </span>
            </button>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#596274]">
              <span className="rounded-md border border-[#d7deea] bg-white px-3 py-2">{project.planning?.length || 0} phases</span>
              <span className="rounded-md border border-[#d7deea] bg-white px-3 py-2">
                {(project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0)} sprints
              </span>
              <span className="rounded-md border border-[#d7deea] bg-white px-3 py-2">{countPlannedTickets(project.planning)} planned items</span>
            </div>
          </div>
        ))}
        {!projects.length ? (
          <p className="rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">
            {loading ? "Loading projects..." : "No assigned projects yet."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TicketsPage({ loading, onStatusChange, tickets }) {
  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Tickets</h2>
        <p className="mt-2 text-sm text-[#596274]">Tickets now live on their own page instead of the member dashboard.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {tickets.map((ticket) => (
          <article className="rounded-lg border-2 border-[#d7deea] border-l-[6px] border-l-[#4b5d8c] bg-white p-5 shadow-[0_1px_0_#eef1f5]" key={ticket._id}>
            <p className="text-sm font-semibold text-[#4b5d8c]">{ticket.project?.name || "Project"}</p>
            <h3 className="mt-2 text-lg font-semibold">{ticket.title}</h3>
            <div className="mt-3 border-t border-dashed border-[#d7deea]" />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.08em] text-[#4b5d8c]">
              Status
              <select
                className="mt-2 h-10 w-full rounded-md border border-[#cbd3df] px-3 text-sm font-semibold capitalize outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20"
                disabled={loading}
                onChange={(event) => onStatusChange(ticket._id, event.target.value)}
                value={ticket.status}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <p className="mt-2 text-sm text-[#596274]">Deadline: {formatDate(ticket.deadline)}</p>
            <p className="mt-2 text-sm text-[#596274]">Sprint: {ticket.sprint?.sprintName || "Not set"}</p>
            <div className="mt-5">
              <button className="h-10 rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold" onClick={() => routeTo(`/member/tickets/${ticket._id}`)} type="button">
                View ticket
              </button>
            </div>
          </article>
        ))}
        {!tickets.length ? (
          <p className="rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">
            {loading ? "Loading tickets..." : "No assigned tickets yet."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RequestsPage({ loading, requests }) {
  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Requests</h2>
        <p className="mt-2 text-sm text-[#596274]">Admin requests open from this page instead of the first dashboard screen.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {requests.map((requestItem) => (
          <article className="rounded-lg border-2 border-[#d7deea] border-l-[6px] border-l-[#243c5a] p-4 shadow-[0_1px_0_#eef1f5]" key={requestItem._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#4b5d8c]">{requestItem.project?.name || "Project"}</p>
                <h3 className="mt-2 font-semibold">{requestItem.title}</h3>
                <p className="mt-2 text-sm text-[#596274]">{requestItem.description || "No description"}</p>
                <p className="mt-3 text-sm text-[#596274]">Raised by {requestItem.createdBy?.name || "member"}</p>
              </div>
              <span className="rounded-md bg-[#eef1f7] px-2 py-1 text-xs font-semibold capitalize text-[#4b5d8c]">
                {requestItem.status?.replaceAll("_", " ") || "open"}
              </span>
            </div>
          </article>
        ))}
        {!requests.length ? (
          <p className="rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">
            {loading ? "Loading requests..." : "No requests raised yet."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DocumentsPage({ documents, loading }) {
  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Documents</h2>
        <p className="mt-2 text-sm text-[#596274]">Project documents now open from a dedicated page.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {documents.map((item) => (
          <article className="rounded-2xl border border-[#edf0f4] bg-white p-5" key={`${item.project._id}-${item.document.url}`}>
            <p className="text-sm font-semibold text-[#4b5d8c]">{item.project.name}</p>
            <h3 className="mt-2 text-lg font-semibold">{item.document.originalName || "Agreement document"}</h3>
            <p className="mt-2 text-sm text-[#596274]">{item.client?.name || "Client"}</p>
            <a className="mt-5 inline-flex h-10 items-center rounded-md bg-[#4b5d8c] px-4 text-sm font-semibold text-white" href={item.document.url} rel="noreferrer" target="_blank">
              Open document
            </a>
          </article>
        ))}
        {!documents.length ? (
          <p className="rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">
            {loading ? "Loading documents..." : "No documents attached to your projects yet."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ProjectDetail({ project, projectClient, requests, tickets }) {
  const projectTicketCount = tickets.filter((ticket) => ticket.project?._id === project?._id).length;

  if (!project) {
    return <p className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">Loading project...</p>;
  }

  const currentPhase = resolveCurrentPhase(project.planning || []);
  const currentSprint = resolveCurrentSprint(currentPhase);
  const sprintCount = (project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0);

  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={() => routeTo("/member/projects")} type="button">
        Back to projects
      </button>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="rounded-md bg-[#eef1f7] px-2 py-1 text-xs font-semibold capitalize text-[#4b5d8c]">{project.status}</span>
          <h2 className="mt-3 text-3xl font-bold">{project.name}</h2>
          <p className="mt-2 text-sm text-[#596274]">{project.description || "No project description"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="h-11 rounded-md bg-[#4b5d8c] px-4 text-sm font-semibold text-white" onClick={() => routeTo(`/member/projects/${project._id}/tickets/new`)} type="button">
            Raise ticket
          </button>
          <button className="h-11 rounded-md bg-[#243c5a] px-4 text-sm font-semibold text-white" onClick={() => routeTo(`/member/projects/${project._id}/requests/new`)} type="button">
            Raise request
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5">
          <h3 className="text-lg font-semibold">Project overview</h3>
          <div className="mt-4 grid gap-2">
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Client</span>
              <span className="text-[#596274]">{project.clientEmail || "No client assigned"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Expected completion</span>
              <span className="text-[#596274]">{projectExpectedTime(project)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Documents</span>
              <span className="text-[#596274]">{projectClient?.agreementDocument?.originalName || "No document attached"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Requests</span>
              <span className="text-[#596274]">{requests.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Raised tickets</span>
              <span className="text-[#596274]">{projectTicketCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5">
          <h3 className="text-lg font-semibold">Planning snapshot</h3>
          <div className="mt-4 grid gap-2">
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Phases</span>
              <span className="text-[#596274]">{project.planning?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Sprints</span>
              <span className="text-[#596274]">{sprintCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Current phase</span>
              <span className="text-[#596274]">{currentPhase?.name || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Current sprint</span>
              <span className="text-[#596274]">{currentSprint?.name || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Raised tickets</span>
              <span className="text-[#596274]">{projectTicketCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#414c5a]">Planned items</span>
              <span className="text-[#596274]">{countPlannedTickets(project.planning)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Members</h3>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#4b5d8c]">{project.members?.length || 0}</span>
        </div>
        <div className="mt-4 grid gap-2">
          {(project.members || []).map((member, index) => (
            <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm" key={member._id}>
              <span className="font-semibold text-[#414c5a]">{index + 1}. {member.name}</span>
              <span className="text-[#596274]">{member.email}</span>
            </div>
          ))}
          {!project.members?.length ? <p className="text-sm text-[#596274]">No members assigned yet.</p> : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Resources</h3>
            <p className="mt-1 text-sm text-[#596274]">Quick reference items for this project.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-[#414c5a]">Agreement file</span>
            <span className="text-[#596274]">{projectClient?.agreementDocument?.originalName || "No document attached"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-[#414c5a]">Client name</span>
            <span className="text-[#596274]">{projectClient?.name || "Not available"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#d7deea] bg-white px-4 py-3 text-sm">
            <span className="font-semibold text-[#414c5a]">Client email</span>
            <span className="text-[#596274]">{projectClient?.email || project.clientEmail || "Not available"}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Delivery plan</h3>
            <p className="mt-1 text-sm text-[#596274]">Review phases and sprints before raising project tickets.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#4b5d8c]">
            {countPlannedTickets(project.planning)} planned items
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {(project.planning || []).map((phase, phaseIndex) => (
            <article className="rounded-2xl border border-[#d8dde5] bg-white p-4 shadow-sm" key={`${phase.name}-${phaseIndex}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4b5d8c]">Phase {phaseIndex + 1}</p>
                  <h4 className="mt-2 text-lg font-semibold">{phase.name || `Untitled phase ${phaseIndex + 1}`}</h4>
                  <p className="mt-1 text-sm text-[#596274]">
                    {phase.startDate || phase.endDate
                      ? `${formatDate(phase.startDate)} to ${formatDate(phase.endDate)}`
                      : "Timeline not set"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e3e8f0] bg-[#fbfcfe] px-3 py-2 text-sm text-[#596274]">
                  {(phase.sprints?.length || 0)} sprints
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#596274]">{phase.outcome || "No phase outcome defined."}</p>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {(phase.sprints || []).map((sprint, sprintIndex) => (
                  <div className="rounded-xl border border-[#e3e8f0] bg-[#fbfcfe] p-4" key={`${sprint.name}-${sprintIndex}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d788a]">Sprint {sprintIndex + 1}</p>
                        <h5 className="mt-2 font-semibold">{sprint.name || `Untitled sprint ${sprintIndex + 1}`}</h5>
                        <p className="mt-1 text-sm text-[#596274]">
                          {sprint.startDate || sprint.endDate
                            ? `${formatDate(sprint.startDate)} to ${formatDate(sprint.endDate)}`
                            : "Timeline not set"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4b5d8c]">
                        {sprint.tickets?.length || 0} planned items
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#596274]">{sprint.outcome || "No sprint outcome defined."}</p>

                    <div className="mt-3 space-y-2">
                      {(sprint.tickets || []).map((plannedTicket, ticketIndex) => (
                        <div className="rounded-lg border border-[#e3e8f0] bg-white px-3 py-3" key={`${plannedTicket.title}-${ticketIndex}`}>
                          <p className="text-sm font-semibold text-[#17201c]">
                            {plannedTicket.title || `Planned item ${ticketIndex + 1}`}
                          </p>
                          <p className="mt-1 text-sm text-[#596274]">{plannedTicket.outcome || "No planned outcome defined."}</p>
                        </div>
                      ))}
                      {!sprint.tickets?.length ? <p className="text-sm text-[#596274]">No planned items in this sprint.</p> : null}
                    </div>
                  </div>
                ))}
                {!phase.sprints?.length ? <p className="text-sm text-[#596274]">No sprints defined in this phase.</p> : null}
              </div>
            </article>
          ))}
          {!project.planning?.length ? <p className="text-sm text-[#596274]">No planning details added yet.</p> : null}
        </div>
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
    return <p className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">Loading project...</p>;
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
        Back to project
      </button>
      <h2 className="mt-5 text-3xl font-bold">Raise ticket for {project.name}</h2>
      <div className="mt-5 rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5">
        <h3 className="text-lg font-semibold">Phase and sprint context</h3>
        <p className="mt-2 text-sm text-[#596274]">Use the project plan below to decide what execution ticket needs to be raised now.</p>
        <div className="mt-4 space-y-3">
          {(project.planning || []).map((phase, phaseIndex) => (
            <div className="rounded-xl border border-[#e3e8f0] bg-white p-4" key={`${phase.name}-${phaseIndex}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#4b5d8c]">Phase {phaseIndex + 1}</p>
              <h4 className="mt-2 font-semibold">{phase.name || `Untitled phase ${phaseIndex + 1}`}</h4>
              <p className="mt-1 text-sm text-[#596274]">{phase.outcome || "No phase outcome defined."}</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {(phase.sprints || []).map((sprint, sprintIndex) => (
                  <div className="rounded-lg border border-[#e3e8f0] bg-[#fbfcfe] p-3" key={`${sprint.name}-${sprintIndex}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6d788a]">Sprint {sprintIndex + 1}</p>
                    <p className="mt-2 font-semibold">{sprint.name || `Untitled sprint ${sprintIndex + 1}`}</p>
                    <p className="mt-1 text-sm text-[#596274]">{sprint.outcome || "No sprint outcome defined."}</p>
                  </div>
                ))}
                {!phase.sprints?.length ? <p className="text-sm text-[#596274]">No sprints defined in this phase.</p> : null}
              </div>
            </div>
          ))}
          {!project.planning?.length ? <p className="text-sm text-[#596274]">No planning details added yet for this project.</p> : null}
        </div>
      </div>
      <form className="mt-6 rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5" onSubmit={onSubmit}>
        <label className="block text-sm font-semibold" htmlFor="title">
          Title
          <input className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="title" name="title" onChange={onTicketChange} required value={ticketForm.title} />
        </label>

        <label className="mt-4 block text-sm font-semibold" htmlFor="deadline">
          Deadline
          <input className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="deadline" name="deadline" onChange={onTicketChange} required type="date" value={ticketForm.deadline} />
        </label>

        <label className="mt-4 block text-sm font-semibold" htmlFor="status">
          Status
          <select className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="status" name="status" onChange={onTicketChange} value={ticketForm.status}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold" htmlFor="sprintSelection">
          Sprint
          <select className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="sprintSelection" name="sprintSelection" onChange={onTicketChange} required value={ticketForm.sprintSelection}>
            <option value="">Select sprint</option>
            {sprintOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold" htmlFor="memberSearch">
          Assign to
          <input className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="memberSearch" onChange={(event) => onMemberSearch(event.target.value)} placeholder="Search project members" value={memberSearch} />
        </label>
        {assignedMember ? <p className="mt-2 rounded-md bg-[#eef1f7] px-3 py-2 text-sm font-semibold text-[#4b5d8c]">Assigned to {assignedMember.name}</p> : null}

        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#edf0f4]">
          {searchedMembers.map((member) => (
            <button className="flex w-full items-center justify-between gap-3 border-b border-[#edf0f4] px-3 py-3 text-left last:border-b-0" key={member._id} onClick={() => onSelectAssignee(member._id)} type="button">
              <span>
                <strong className="block">{member.name}</strong>
                <span className="text-sm text-[#596274]">{member.email}</span>
              </span>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${ticketForm.assignedTo === member._id ? "bg-[#dce6ff] text-[#3a4f83]" : "bg-[#eef1f7] text-[#4b5d8c]"}`}>
                {ticketForm.assignedTo === member._id ? "Selected" : "Assign"}
              </span>
            </button>
          ))}
          {!searchedMembers.length ? <p className="p-4 text-sm text-[#596274]">No project members found.</p> : null}
        </div>

        <label className="mt-4 block text-sm font-semibold" htmlFor="description">
          Description
          <textarea className="mt-2 min-h-28 w-full rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="description" name="description" onChange={onTicketChange} value={ticketForm.description} />
        </label>

        <label className="mt-4 block text-sm font-semibold" htmlFor="urlsText">
          URLs
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="urlsText" name="urlsText" onChange={onTicketChange} placeholder="One URL per line" value={ticketForm.urlsText} />
        </label>

        <button className="mt-5 h-12 w-full rounded-md bg-[#4b5d8c] font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Creating..." : "Raise ticket"}
        </button>
      </form>
    </section>
  );
}

function CreateRequestPage({ loading, onBack, onRequestChange, onSubmit, project, requestForm }) {
  if (!project) {
    return <p className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">Loading project...</p>;
  }

  return (
    <section className="mt-8 rounded-[1.75rem] border border-[#d8dde5] bg-white p-6 shadow-sm">
      <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
        Back to project
      </button>
      <h2 className="mt-5 text-3xl font-bold">Raise request for {project.name}</h2>
      <form className="mt-6 rounded-2xl border border-[#edf0f4] bg-[#fbfcfe] p-5" onSubmit={onSubmit}>
        <label className="block text-sm font-semibold" htmlFor="requestTitle">
          Title
          <input className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#243c5a] focus:ring-2 focus:ring-[#243c5a]/20" id="requestTitle" name="title" onChange={onRequestChange} required value={requestForm.title} />
        </label>
        <label className="mt-4 block text-sm font-semibold" htmlFor="requestDescription">
          Description
          <textarea className="mt-2 min-h-28 w-full rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#243c5a] focus:ring-2 focus:ring-[#243c5a]/20" id="requestDescription" name="description" onChange={onRequestChange} value={requestForm.description} />
        </label>
        <button className="mt-5 h-12 w-full rounded-md bg-[#243c5a] font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Saving..." : "Send request to admin"}
        </button>
      </form>
    </section>
  );
}

function TicketDetail({ loading, onBack, onStatusChange, ticket }) {
  if (!ticket) {
    return <p className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">Loading ticket...</p>;
  }

  return (
    <section className="mt-8 rounded-lg border-2 border-[#d7deea] border-l-[6px] border-l-[#4b5d8c] bg-white p-5 shadow-sm">
      <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
        Back to tickets
      </button>
      <p className="mt-5 text-sm font-semibold text-[#4b5d8c]">{ticket.project?.name || "Project"}</p>
      <h2 className="mt-2 text-3xl font-bold">{ticket.title}</h2>
      <div className="mt-4 border-t border-dashed border-[#d7deea]" />
      <label className="mt-5 block max-w-sm text-sm font-semibold text-[#4b5d8c]" htmlFor="ticketDetailStatus">
        Status
        <select
          className="mt-2 h-11 w-full rounded-md border border-[#cbd3df] px-3 text-sm font-semibold capitalize outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20"
          disabled={loading}
          id="ticketDetailStatus"
          onChange={(event) => onStatusChange(ticket._id, event.target.value)}
          value={ticket.status}
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
      <p className="mt-3 text-sm text-[#596274]">Deadline: {formatDate(ticket.deadline)}</p>
      <p className="mt-3 text-sm text-[#596274]">Sprint: {ticket.sprint?.phaseName ? `${ticket.sprint.phaseName} -> ${ticket.sprint.sprintName}` : "Not set"}</p>
      <p className="mt-3 text-sm text-[#596274]">{ticket.description || "No description"}</p>
      <div className="mt-5">
        <p className="text-sm font-semibold text-[#4b5d8c]">Links</p>
        <div className="mt-2 space-y-2">
          {ticket.urls?.length ? (
            ticket.urls.map((url) => (
              <a className="block text-sm font-semibold text-[#4b5d8c]" href={url} key={url} rel="noreferrer" target="_blank">
                {url}
              </a>
            ))
          ) : (
            <p className="text-sm text-[#596274]">No URLs added.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default MemberDashboard;
