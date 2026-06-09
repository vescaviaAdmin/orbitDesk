import { cloneElement, useEffect, useId, useMemo, useState } from "react";
import {
  addMemberProjectResources,
  getMemberProject,
  getMemberTicket,
  listMemberProjects,
  listMemberTickets,
  raiseRequest,
  raiseTicket,
  updateMemberTicketStatus,
} from "../../api/member";
import StatusBadge from "../../components/member/StatusBadge";
import StatusSelect from "../../components/member/StatusSelect";
import ProjectTable from "../../components/tables/ProjectTable";
import TableSection from "../../components/tables/TableSection";
import TicketFilters from "../../components/tables/TicketFilters";
import TicketTable from "../../components/tables/TicketTable";
import { useToast } from "../../components/ui/Toast";
import {
  countPlannedTickets,
  filterAndSortTickets,
  formatDate,
  getProjectTone,
  getStatusTone,
  normalizeStatus,
  projectExpectedTime,
} from "../../lib/member-utils";
import { routeTo } from "../../lib/navigation";
import { clearPortalSession, getPortalSession, isSessionExpiredError, redirectToPortalLogin } from "../../lib/session";

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

const PROJECT_DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "issues", label: "Issues" },
];

const NAV_ITEMS = [
  ["dashboard", "Dashboard", "/member/dashboard"],
  ["projects", "Projects", "/member/projects"],
  ["requests", "Requests", "/member/requests"],
  ["documents", "Documents", "/member/documents"],
];

function buildTicketPath(ticketId) {
  return `/member/tickets/${ticketId}`;
}

function buildTicketShareUrl(ticketId) {
  if (typeof window === "undefined") {
    return buildTicketPath(ticketId);
  }

  return new URL(buildTicketPath(ticketId), window.location.origin).toString();
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

function getInitials(value) {
  return (value || "OD")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OD";
}

function MemberDashboard() {
  const toast = useToast();
  const session = getPortalSession();
  const [path, setPath] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isDashboardPath = path === "/member" || path === "/member/dashboard";
  const isProjectsPath = path === "/member/projects";
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
      projectDirectory.flatMap((entry) => {
        const agreementItems = entry.client?.agreementDocument?.url
          ? [
              {
                project: entry.project,
                href: entry.client.agreementDocument.url,
                label: entry.client.agreementDocument.originalName || "Agreement document",
                meta: "Client agreement",
              },
            ]
          : [];

        const resourceItems = (entry.project?.resources || []).map((resource) => ({
          project: entry.project,
          href: resource.url,
          label: resource.name || "Project resource",
          meta: `Added by ${resource.addedByName || resource.addedByRole || "workspace"}`,
        }));

        return [...agreementItems, ...resourceItems];
      }),
    [projectDirectory],
  );

  useEffect(() => {
    if (!session.token || session.role !== "member") {
      redirectToPortalLogin();
    }
  }, [session.role, session.token]);

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    if (path === "/member/tickets") {
      routeTo("/member/dashboard");
    }
  }, [path]);

  useEffect(() => {
    if (projectTicketsPathId) {
      routeTo(`/member/projects/${projectTicketsPathId}?tab=issues`);
    }
  }, [projectTicketsPathId]);

  async function loadHomeData() {
    setLoading(true);

    try {
      const [projectData, ticketData] = await Promise.all([listMemberProjects(), listMemberTickets()]);
      setProjects(projectData.projects || []);
      setTickets(ticketData.tickets || []);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProject(projectId) {
    setLoading(true);

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
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTicket(ticketId) {
    setLoading(true);

    try {
      const data = await getMemberTicket(ticketId);
      setSelectedTicket(data.ticket);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
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
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
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

    setShareTicket({
      closePath: options.closePath || "",
      title: ticket.title || "Ticket",
      url: buildTicketShareUrl(ticket._id),
    });
  }

  function closeShareTicket() {
    setShareTicket(null);
  }

  async function handleCopyTicketLink() {
    if (!shareTicket?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareTicket.url);
      toast.success("Link copied");
    } catch (copyError) {
      toast.error("Copy failed");
    }
  }

  async function handleTicketSubmit(event) {
    event.preventDefault();

    if (!selectedProject) {
      toast.error("Select a project before raising a ticket.");
      return;
    }

    const title = ticketForm.title.trim();
    const description = ticketForm.description.trim();
    const urls = ticketForm.urlsText
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (!title) {
      toast.error("Ticket title is required.");
      return;
    }

    if (!ticketForm.assignedTo) {
      toast.error("Select an assignee from the project members.");
      return;
    }

    if (!ticketForm.deadline) {
      toast.error("Due date is required.");
      return;
    }

    setSubmitting(true);

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
      toast.success(data.message);
      openShareTicket(data.ticket, {
        closePath: `/member/projects/${selectedProject._id}?tab=issues`,
      });
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();

    if (!selectedProject) {
      return;
    }

    setSubmitting(true);

    try {
      const data = await raiseRequest(selectedProject._id, {
        title: requestForm.title,
        description: requestForm.description,
      });

      setProjectRequests((current) => [data.request, ...current]);
      setRequestForm(emptyRequest);
      toast.success(data.message);
      routeTo("/member/requests");
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(ticketId, nextStatus) {
    setLoading(true);

    try {
      const data = await updateMemberTicketStatus(ticketId, nextStatus);
      applyTicketUpdate(data.ticket);
      toast.success(data.message);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectResourceAdd(resources) {
    if (!selectedProject) {
      return;
    }

    setLoading(true);

    try {
      const data = await addMemberProjectResources(selectedProject._id, resources);
      setSelectedProject(data.project);
      setProjects((current) => current.map((project) => (project._id === data.project._id ? { ...project, ...data.project } : project)));
      setProjectDirectory((current) =>
        current.map((entry) => (entry.project._id === data.project._id ? { ...entry, project: data.project } : entry)),
      );
      toast.success(data.message);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }

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

  const pageHeading = useMemo(() => {
    if (isDashboardPath) {
      return {
        title: `Hello, ${session.user?.name || "Workspace member"}`,
        subtitle: "Here is what is moving across your projects today.",
      };
    }

    if (isProjectsPath) {
      return {
        title: "Projects",
        subtitle: "Track delivery progress across every workspace you are part of.",
      };
    }

    if (projectIdFromPath) {
      return {
        title: selectedProject?.name || "Project detail",
        subtitle: selectedProject?.description || "Planning, resources, and quick actions for this workspace.",
      };
    }

    if (createTicketProjectId) {
      return {
        title: "Raise ticket",
        subtitle: selectedProject ? `Create a ticket for ${selectedProject.name}.` : "Capture the issue and assign an owner.",
      };
    }

    if (createRequestProjectId) {
      return {
        title: "Raise request",
        subtitle: selectedProject ? `Coordinate with the team on ${selectedProject.name}.` : "Share a coordination request with the team.",
      };
    }

    if (ticketIdFromPath) {
      return {
        title: selectedTicket?.title || "Issue detail",
        subtitle: "Review status, attachments, and delivery context.",
      };
    }

    if (isRequestsPath) {
      return {
        title: "Requests",
        subtitle: "Team coordination across your assigned projects.",
      };
    }

    if (isDocumentsPath) {
      return {
        title: "Documents",
        subtitle: "Client agreements and shared project resources.",
      };
    }

    return {
      title: "Member workspace",
      subtitle: "Projects, tickets, and delivery flow.",
    };
  }, [
    createRequestProjectId,
    createTicketProjectId,
    isDashboardPath,
    isDocumentsPath,
    isProjectsPath,
    isRequestsPath,
    projectIdFromPath,
    projectTicketsPathId,
    selectedProject,
    selectedTicket,
    session.user?.name,
    ticketIdFromPath,
  ]);

  function isNavActive(key) {
    if (key === "dashboard") {
      return isDashboardPath;
    }

    if (key === "projects") {
      return isProjectsPath || Boolean(projectIdFromPath) || Boolean(projectTicketsPathId) || Boolean(createTicketProjectId) || Boolean(createRequestProjectId);
    }

    if (key === "requests") {
      return isRequestsPath;
    }

    if (key === "documents") {
      return isDocumentsPath;
    }

    return false;
  }

  const activeProjectTab = new URLSearchParams(search).get("tab") === "issues" ? "issues" : "overview";
  const showProjectTabs = Boolean(projectIdFromPath) && !createTicketProjectId && !createRequestProjectId;
  const showTicketHeader = Boolean(ticketIdFromPath);

  function handleTicketBack() {
    if (selectedTicket?.project?._id) {
      routeTo(`/member/projects/${selectedTicket.project._id}?tab=issues`);
      return;
    }

    routeTo("/member/dashboard");
  }

  function setProjectTab(tab) {
    if (!selectedProject?._id) {
      return;
    }

    const basePath = `/member/projects/${selectedProject._id}`;
    routeTo(tab === "issues" ? `${basePath}?tab=issues` : basePath);
  }

  function logoutMember() {
    clearPortalSession();
    redirectToPortalLogin();
  }

  return (
    <main className="workspace-shell">
      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              OD
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">OrbitDesk</p>
              <p className="muted-text truncate text-xs">Member workspace</p>
            </div>
          </div>

          <nav aria-label="Member workspace" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            <p className="sidebar-section-label">Workspace</p>
            {NAV_ITEMS.map(([key, label, href]) => (
              <button
                aria-current={isNavActive(key) ? "page" : undefined}
                className={`sidebar-link w-full justify-between ${isNavActive(key) ? "sidebar-link-active" : ""}`}
                key={key}
                onClick={() => routeTo(href)}
                type="button"
              >
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--border)] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <span className="avatar-badge">{getInitials(session.user?.name || session.user?.email)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{session.user?.name || "Workspace member"}</p>
                <p className="muted-text truncate text-xs">{session.user?.email || "Delivery team"}</p>
              </div>
            </div>
            <button className="secondary-button mt-3 w-full" onClick={logoutMember} type="button">
              Logout
            </button>
          </div>
        </aside>

        <section className="workspace-main">
          <div className="workspace-header-group">
            <header className="workspace-topbar">
              <div className="flex min-w-0 items-start gap-3">
                {showProjectTabs ? (
                  <IconButton label="Back to projects" onClick={() => routeTo("/member/projects")}>
                    <IconBack />
                  </IconButton>
                ) : null}
                {showTicketHeader ? (
                  <IconButton label="Back to issues" onClick={handleTicketBack}>
                    <IconBack />
                  </IconButton>
                ) : null}
                <div className="min-w-0">
                  <h1 className="section-title truncate">{pageHeading.title}</h1>
                  <p className="muted-text mt-1 text-sm">{pageHeading.subtitle}</p>
                </div>
              </div>
              <div className="action-row">
                {showProjectTabs && selectedProject ? (
                  <>
                    <button className="primary-button" onClick={() => routeTo(`/member/projects/${selectedProject._id}/tickets/new`)} type="button">
                      Raise ticket
                    </button>
                    <IconButton label="Raise request" onClick={() => routeTo(`/member/projects/${selectedProject._id}/requests/new`)}>
                      <IconCompose />
                    </IconButton>
                  </>
                ) : null}
                {showTicketHeader && selectedTicket ? (
                  <IconButton label="Share ticket" onClick={() => openShareTicket(selectedTicket)}>
                    <IconShare />
                  </IconButton>
                ) : null}
                <button aria-label="Refresh workspace" className="icon-button" onClick={loadHomeData} title="Refresh workspace" type="button">
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path d="M20 7v5h-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    <path d="M4 17v-5h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    <path d="M18.2 9A7 7 0 0 0 6.4 6.9L4 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    <path d="M5.8 15A7 7 0 0 0 17.6 17.1L20 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  </svg>
                </button>
              </div>
            </header>

            {showProjectTabs ? (
              <nav aria-label="Project sections" className="workspace-tabbar" role="tablist">
                {PROJECT_DETAIL_TABS.map((tab) => (
                  <button
                    aria-selected={activeProjectTab === tab.key}
                    className={`workspace-tab${activeProjectTab === tab.key ? " workspace-tab-active" : ""}`}
                    key={tab.key}
                    onClick={() => setProjectTab(tab.key)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>

          <div className="workspace-content space-y-6">
            {loading && isDashboardPath && !projects.length && !tickets.length ? <WorkspaceSkeleton /> : null}

          {isDashboardPath && (!loading || projects.length || tickets.length) ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Pending projects" tone="pending" value={projectStatusCounts.pending} note="Waiting for kickoff or planning" onClick={() => routeTo("/member/projects")} />
              <MetricCard label="Assigned projects" tone="assigned" value={projectStatusCounts.assigned} note="Active workspaces in delivery" onClick={() => routeTo("/member/projects")} />
              <MetricCard label="Completed projects" tone="completed" value={projectStatusCounts.completed} note="Delivered workspaces" onClick={() => routeTo("/member/projects")} />
              <MetricCard label="Open tickets" value={tickets.filter((ticket) => ticket.status === "open").length} note="Awaiting active execution" onClick={() => routeTo("/member/dashboard")} />
            </section>
          ) : null}

          {isDashboardPath ? (
            <DashboardHome loading={loading} onStatusChange={handleStatusChange} projects={projects} tickets={tickets} />
          ) : null}
          {isProjectsPath && (!loading || projects.length) ? <ProjectsPage loading={loading} projects={projects} /> : null}
          {isRequestsPath ? <RequestsPage loading={loading} requests={requestsFeed} /> : null}
          {isDocumentsPath ? <DocumentsPage documents={documentsFeed} loading={loading} /> : null}
          {projectIdFromPath ? (
            <ProjectDetail
              activeTab={activeProjectTab}
              loading={loading}
              onAddResources={handleProjectResourceAdd}
              onStatusChange={handleStatusChange}
              project={selectedProject}
              projectClient={projectClient}
              requests={projectRequests}
              tickets={tickets}
            />
          ) : null}
          {ticketIdFromPath ? (
            <TicketDetail
              loading={loading}
              onStatusChange={handleStatusChange}
              ticket={selectedTicket}
            />
          ) : null}
          {createTicketProjectId ? (
            <CreateTicketPage
              assignedMember={assignedMember}
              loading={loading}
              memberSearch={memberSearch}
              submitting={submitting}
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
              submitting={submitting}
              onBack={() => routeTo(`/member/projects/${createRequestProjectId}`)}
              onRequestChange={updateRequest}
              onSubmit={handleRequestSubmit}
              project={selectedProject}
              requestForm={requestForm}
            />
          ) : null}
          </div>
        </section>
      </div>

      {shareTicket ? (
        <ShareTicketModal
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

function MetricCard({ label, value, note, onClick, tone = "neutral" }) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag className={`metric-card metric-card-${tone} w-full text-left ${onClick ? "cursor-pointer hover:shadow-md" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`status-dot status-dot-${tone === "neutral" ? "neutral" : tone}`} />
        <p className="muted-text text-sm font-semibold">{label}</p>
      </div>
      <strong className="metric-value">{value}</strong>
      <p className="muted-text mt-2 text-sm">{note}</p>
    </Tag>
  );
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="loading-skeleton h-32" key={index} />
        ))}
      </div>
      <div className="loading-skeleton h-72" />
    </div>
  );
}

function DashboardHome({ loading, onStatusChange, projects, tickets }) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("updatedAt");

  const filteredTickets = useMemo(
    () =>
      filterAndSortTickets(tickets, {
        query,
        projectId: projectId === "all" ? "" : projectId,
        status: status === "all" ? "" : status,
        sort,
      }),
    [projectId, query, sort, status, tickets],
  );

  return (
    <TableSection
      subtitle="Scan and update tickets across all assigned projects."
      title="Execution tickets"
    >
      <TicketFilters
        onProjectChange={setProjectId}
        onQueryChange={setQuery}
        onSortChange={setSort}
        onStatusChange={setStatus}
        projectId={projectId}
        projects={projects}
        query={query}
        sort={sort}
        status={status}
      />
      <TicketTable
        emptyCopy={query || projectId || status ? "No issues match your filters." : "No assigned tickets yet."}
        loading={loading}
        onStatusChange={onStatusChange}
        tickets={filteredTickets}
      />
    </TableSection>
  );
}

function ProjectsPage({ loading, projects }) {
  return (
    <TableSection
      subtitle="Open a project from the table or jump straight to its issues."
      title="Assigned workspaces"
    >
      <ProjectTable loading={loading} projects={projects} />
    </TableSection>
  );
}

function RequestsPage({ loading, requests }) {
  return (
    <section className="surface-card p-6">
      <h2 className="section-title">Team coordination feed</h2>
      <p className="muted-text mt-2 text-sm">Requests raised across your assigned projects.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {requests.map((requestItem) => (
          <article className="surface-muted p-5" key={requestItem._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{requestItem.title}</h3>
                <p className="muted-text mt-1 text-sm">{requestItem.project?.name || "Project"}</p>
              </div>
              <StatusBadge status={requestItem.status} />
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
    <section className="surface-card p-6">
      <h2 className="section-title">Project resources</h2>
      <p className="muted-text mt-2 text-sm">Client agreements and files shared with your workspaces.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {documents.map((item) => (
          <article className="surface-muted p-5" key={`${item.project._id}-${item.href}`}>
            <p className="font-semibold text-foreground">{item.label}</p>
            <p className="muted-text mt-1 text-sm">{item.project.name}</p>
            <p className="muted-text mt-2 text-sm">{item.meta}</p>
            <a className="primary-button mt-4" href={item.href} rel="noreferrer" target="_blank">
              Open resource
            </a>
          </article>
        ))}
        {!documents.length ? <EmptyCard copy={loading ? "Loading documents..." : "No resources attached to your projects yet."} /> : null}
      </div>
    </section>
  );
}

function ProjectDetail({ activeTab = "overview", loading, onAddResources, onStatusChange, project, projectClient, requests, tickets }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [resourceRows, setResourceRows] = useState([]);

  useEffect(() => {
    setResourceRows([]);
  }, [project?._id]);

  const projectTickets = useMemo(
    () => tickets.filter((ticket) => ticket.project?._id === project?._id),
    [project?._id, tickets],
  );

  const filteredProjectTickets = useMemo(
    () =>
      filterAndSortTickets(projectTickets, {
        query,
        status: status === "all" ? "" : status,
        sort,
      }),
    [projectTickets, query, sort, status],
  );

  if (!project) {
    return <section className="surface-card p-6 text-sm text-muted-foreground">Loading project...</section>;
  }

  const currentPhase = resolveCurrentPhase(project.planning || []);
  const currentSprint = resolveCurrentSprint(currentPhase);
  const projectDocuments = projectClient?.agreementDocument?.url ? [projectClient.agreementDocument] : [];
  const projectResources = project.resources || [];
  const resourceItems = [
    ...projectDocuments.map((document) => ({
      href: document.url,
      label: document.originalName || "Agreement document",
      meta: "Client agreement",
    })),
    ...projectResources.map((resource) => ({
      href: resource.url,
      label: resource.name || "Project resource",
      meta: `Added by ${resource.addedByName || resource.addedByRole || "workspace"}`,
    })),
  ];

  function addResourceRow() {
    setResourceRows((current) => [...current, { name: "", url: "" }]);
  }

  function updateResourceRow(index, field, value) {
    setResourceRows((current) => current.map((resource, currentIndex) => (currentIndex === index ? { ...resource, [field]: value } : resource)));
  }

  function removeResourceRow(index) {
    setResourceRows((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function saveResources() {
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
    <div className="space-y-6">
      {activeTab === "issues" ? (
        <TableSection
          subtitle="Issues scoped to this project."
          title="Project issues"
        >
          <TicketFilters
            onProjectChange={() => {}}
            onQueryChange={setQuery}
            onSortChange={setSort}
            onStatusChange={setStatus}
            query={query}
            showProjectFilter={false}
            sort={sort}
            status={status}
          />
          <TicketTable
            emptyCopy={query || status ? "No issues match your filters." : "No issues raised for this project yet."}
            loading={loading}
            onStatusChange={onStatusChange}
            showProject={false}
            tickets={filteredProjectTickets}
          />
        </TableSection>
      ) : (
        <div className="detail-layout">
          <div className="detail-main-stack">
            <section className="surface-muted p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="compact-panel-title">Delivery plan</h3>
                <span className="glass-chip">{countPlannedTickets(project.planning)} planned items</span>
              </div>
              <div className="mt-5 divide-y divide-[var(--border)]">
                {(project.planning || []).map((phase, phaseIndex) => (
                  <article className="py-4 first:pt-0" key={`${project._id}-${phaseIndex}`}>
                    <p className="muted-text text-xs font-semibold">Phase {phaseIndex + 1}</p>
                    <h4 className="mt-2 text-sm font-semibold text-foreground">{phase.name || `Phase ${phaseIndex + 1}`}</h4>
                    <p className="muted-text mt-2 text-sm leading-5">{phase.outcome || "No phase outcome defined."}</p>
                    <div className="mt-4 space-y-3 border-l-2 border-[var(--border)] pl-4">
                      {(phase.sprints || []).map((sprint, sprintIndex) => (
                        <div key={`${phaseIndex}-${sprintIndex}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-foreground">{sprint.name || `Sprint ${sprintIndex + 1}`}</span>
                            <span className="glass-chip">{formatDate(sprint.endDate)}</span>
                          </div>
                          <p className="muted-text mt-1 text-sm leading-5">{sprint.outcome || "No sprint outcome defined."}</p>
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
            <section className="surface-muted p-4">
              <h3 className="compact-panel-title">Project summary</h3>
              <div className="summary-stack mt-2.5">
                <SummaryRow label="Status">
                  <ProjectStatusBadge status={project.status} />
                </SummaryRow>
                <SummaryRow label="Client" value={projectClient?.name || project.clientEmail || "Not assigned"} />
                <SummaryRow label="Expected delivery" value={projectExpectedTime(project)} />
                <SummaryRow label="Phase" value={currentPhase?.name || "Not set"} />
                <SummaryRow label="Sprint" value={currentSprint?.name || "Not set"} />
                <SummaryRow label="Tickets" value={projectTickets.length} />
                <SummaryRow label="Requests" value={requests.length} />
                <SummaryRow label="Members" value={project.members?.length || 0} />
                <SummaryRow label="Agreement">
                  <AgreementBadge attached={Boolean(projectDocuments.length)} />
                </SummaryRow>
                <SummaryRow label="Resources" value={projectResources.length} />
              </div>
            </section>

            <section className="surface-muted p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="compact-panel-title">Resources</h3>
                <div className="flex items-center gap-2">
                  <span className="glass-chip">{resourceItems.length}</span>
                  <button className="secondary-button h-9 px-3 text-sm" onClick={addResourceRow} type="button">
                    Add
                  </button>
                </div>
              </div>
              {resourceRows.length ? (
                <div className="mt-4 space-y-3">
                  {resourceRows.map((resource, index) => (
                    <div className="rounded-xl border border-[var(--border)] bg-background p-3" key={`member-resource-row-${index}`}>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
                        <label className="block text-sm font-semibold text-foreground">
                          Name
                          <input
                            className="input-field mt-2"
                            onChange={(event) => updateResourceRow(index, "name", event.target.value)}
                            placeholder="Sprint board"
                            value={resource.name}
                          />
                        </label>
                        <label className="block text-sm font-semibold text-foreground">
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
                    <button className="primary-button" disabled={loading} onClick={saveResources} type="button">
                      {loading ? "Saving..." : "Save resources"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 divide-y divide-[var(--border)]">
                {resourceItems.map((resource) => (
                  <div className="flex items-center justify-between gap-3 py-3 first:pt-0" key={resource.href}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{resource.label}</p>
                      <p className="muted-text mt-1 text-sm">{resource.meta}</p>
                    </div>
                    <a aria-label={`Open ${resource.label}`} className="icon-button icon-button-sm" href={resource.href} rel="noreferrer" target="_blank" title="Open resource">
                      <IconOpen />
                    </a>
                  </div>
                ))}
                {!resourceItems.length ? <EmptyCard copy="No project resources attached yet." /> : null}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function TicketDetail({ loading, onStatusChange, ticket }) {
  if (!ticket) {
    return <section className="surface-card p-6 text-sm text-muted-foreground">Loading ticket...</section>;
  }

  return (
    <div className="detail-layout">
      <div className="detail-main-stack">
        <section className="surface-muted p-5">
          <h3 className="compact-panel-title">Description</h3>
          <p className="muted-text mt-4 text-sm leading-6">{ticket.description || "No description provided."}</p>
        </section>

        <section className="surface-muted p-5">
          <h3 className="compact-panel-title">Comments</h3>
          <div className="empty-state mt-4">
            <p className="muted-text text-sm">Comments will appear here when collaborative updates are available.</p>
          </div>
        </section>
      </div>

      <aside className="detail-side-stack">
        <section className="surface-muted p-5">
          <h3 className="compact-panel-title">Issue details</h3>
          <div className="summary-stack mt-2.5">
            <SummaryRow label="Status">
              <StatusSelect
                className="w-full"
                disabled={loading}
                onChange={(event) => onStatusChange(ticket._id, event.target.value)}
                status={ticket.status}
              />
            </SummaryRow>
            <SummaryRow label="Assignee" value={ticket.assignedTo?.name || ticket.assignedTo?.email || "Unassigned"} />
            <SummaryRow label="Priority" value={normalizeStatus(ticket.priority || "medium")} />
            <SummaryRow label="Due" value={formatDate(ticket.deadline)} />
            <SummaryRow label="Sprint" value={ticket.sprint?.sprintName || "Not set"} />
            <SummaryRow label="Project" value={ticket.project?.name || "-"} />
            <SummaryRow label="Reporter" value="Member workspace" />
          </div>
        </section>

        <section className="surface-muted p-5">
          <h3 className="compact-panel-title">Documents</h3>
          <div className="mt-4 divide-y divide-[var(--border)]">
            {(ticket.urls || []).map((url) => (
              <div className="flex items-start justify-between gap-3 py-3 first:pt-0" key={url}>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Attachment link</p>
                  <p className="muted-text mt-1 break-all text-sm">{url}</p>
                </div>
                <a aria-label="Open attachment" className="icon-button icon-button-sm shrink-0" href={url} rel="noreferrer" target="_blank" title="Open attachment">
                  <IconOpen />
                </a>
              </div>
            ))}
            {!ticket.urls?.length ? <EmptyCard copy="No attachments added to this issue yet." /> : null}
          </div>
        </section>
      </aside>
    </div>
  );
}

function CreateTicketPage({ assignedMember, loading, memberSearch, onBack, onMemberSearch, onSelectAssignee, onSubmit, onTicketChange, project, searchedMembers, submitting, ticketForm }) {
  if (!project) {
    return <section className="surface-card p-6 text-sm text-muted-foreground">Loading project...</section>;
  }

  return (
    <section className="surface-card p-6">
      <IconButton label="Back to project" onClick={onBack}>
        <IconBack />
      </IconButton>
      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form className="surface-muted p-5" onSubmit={onSubmit}>
          <h2 className="section-title">Raise ticket for {project.name}</h2>
          <p className="muted-text mt-3 text-sm leading-6">Capture the issue clearly, assign the right owner, and keep the ticket ready for immediate action.</p>

          <Field label="Title">
            <input className="input-field mt-2" name="title" onChange={onTicketChange} placeholder="Summarize the issue clearly" required value={ticketForm.title} />
          </Field>

          <Field label="Due date">
            <input className="input-field mt-2" min={getTodayInputValue()} name="deadline" onChange={onTicketChange} required type="date" value={ticketForm.deadline} />
          </Field>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              <select className="input-field mt-2" name="status" onChange={onTicketChange} value={ticketForm.status}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Done</option>
              </select>
            </Field>

            <Field label="Priority">
              <select className="input-field mt-2" name="priority" onChange={onTicketChange} value={ticketForm.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>

            <Field label="Type">
              <select className="input-field mt-2" name="type" onChange={onTicketChange} value={ticketForm.type}>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea className="input-field mt-2 min-h-28" name="description" onChange={onTicketChange} value={ticketForm.description} />
          </Field>

          <Field label="Links">
            <textarea className="input-field mt-2 min-h-24" name="urlsText" onChange={onTicketChange} placeholder="One link per line" value={ticketForm.urlsText} />
          </Field>

          <Field label="Assignee">
            <input className="input-field mt-2" onChange={(event) => onMemberSearch(event.target.value)} placeholder="Search project members" value={memberSearch} />
          </Field>
          {assignedMember ? <p className="badge badge-primary mt-3">Assigned to {assignedMember.name}</p> : null}

          <div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-[var(--border)] bg-background">
            {searchedMembers.map((member) => (
              <button className="flex w-full items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 text-left last:border-b-0" key={member._id} onClick={() => onSelectAssignee(member._id)} type="button">
                <span>
                  <strong className="block text-foreground">{member.name}</strong>
                  <span className="muted-text text-sm">{member.email}</span>
                </span>
                <span className={`badge ${ticketForm.assignedTo === member._id ? "badge-primary" : "badge-info"}`}>
                  {ticketForm.assignedTo === member._id ? "Selected" : "Assign"}
                </span>
              </button>
            ))}
          </div>

          <button className="primary-button mt-5 w-full" disabled={submitting} type="submit">
            {submitting ? "Submitting..." : "Create ticket"}
          </button>
        </form>

        <section className="surface-muted p-5">
          <h2 className="section-title">Project context</h2>
          <div className="mt-5 space-y-4">
            {(project.planning || []).map((phase, phaseIndex) => (
              <article className="surface-card p-4" key={`${project._id}-${phaseIndex}`}>
                <h3 className="font-semibold text-foreground">{phase.name || `Phase ${phaseIndex + 1}`}</h3>
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

function CreateRequestPage({ loading, onBack, onRequestChange, onSubmit, project, requestForm, submitting }) {
  if (!project) {
    return <section className="surface-card p-6 text-sm text-muted-foreground">Loading project...</section>;
  }

  return (
    <section className="surface-card p-6">
      <IconButton label="Back to project" onClick={onBack}>
        <IconBack />
      </IconButton>
      <form className="surface-muted mt-5 p-5" onSubmit={onSubmit}>
        <h2 className="section-title">Raise request for {project.name}</h2>
        <p className="muted-text mt-3 text-sm leading-6">Share a coordination need with the delivery team on this workspace.</p>

        <Field label="Title">
          <input className="input-field mt-2" name="title" onChange={onRequestChange} required value={requestForm.title} />
        </Field>

        <Field label="Description">
          <textarea className="input-field mt-2 min-h-32" name="description" onChange={onRequestChange} required value={requestForm.description} />
        </Field>

        <button className="primary-button mt-5 w-full" disabled={submitting} type="submit">
          {submitting ? "Submitting..." : "Create request"}
        </button>
      </form>
    </section>
  );
}

function ShareTicketModal({ onClose, onCopy, onOpen, ticket }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4">
      <div className="surface-card w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Share {ticket.title}</h2>
            <p className="muted-text mt-3 text-sm leading-6">Copy this direct ticket link or open the ticket detail page.</p>
          </div>
          <button aria-label="Close share ticket dialog" className="icon-button" onClick={onClose} type="button">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>

        <Field label="Ticket link">
          <input className="input-field mt-2" readOnly value={ticket.url} />
        </Field>

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

function Field({ children, label }) {
  const fieldId = useId();

  return (
    <div className="mt-4 first:mt-5">
      <label className="block text-sm font-semibold text-foreground" htmlFor={fieldId}>
        {label}
      </label>
      {cloneElement(children, { id: fieldId })}
    </div>
  );
}

function SummaryRow({ children, label, value }) {
  return (
    <div className="summary-row">
      <p className="summary-row-label">{label}</p>
      <div className="summary-row-value">{children ?? value}</div>
    </div>
  );
}

function ProjectStatusBadge({ status }) {
  const tone = getProjectTone(status);

  return (
    <span className={`status-pill status-pill-${tone}`}>
      <span aria-hidden="true" className={`status-dot status-dot-${tone}`} />
      {normalizeStatus(status)}
    </span>
  );
}

function AgreementBadge({ attached }) {
  return (
    <span className={attached ? "badge badge-success" : "badge badge-warning"}>
      <span aria-hidden="true" className={`status-dot status-dot-${attached ? "completed" : "pending"}`} />
      {attached ? "Attached" : "Missing"}
    </span>
  );
}

function EmptyCard({ copy }) {
  return (
    <div className="empty-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-sm font-bold text-muted-foreground">
        OD
      </div>
      <p className="muted-text mt-4 text-sm">{copy}</p>
    </div>
  );
}

function IconButton({ children, label, onClick }) {
  return (
    <button aria-label={label} className="icon-button icon-button-sm" onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function IconOpen() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M14 4h6v6M10 14L20 4M20 14v6h-6M4 10V4h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M16 8l-8 4 8 4V8z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M6 6v12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M18 10v4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export default MemberDashboard;
