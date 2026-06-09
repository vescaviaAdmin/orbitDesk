import { useEffect, useMemo, useState } from "react";
import {
  addClient,
  addMember,
  addProject,
  addProjectResources,
  addProjectTicket,
  clearAdminSession,
  getAdminSession,
  getAdminSessionStatus,
  getProject,
  listClients,
  listIssues,
  listMembers,
  listProjects,
  listRequests,
  updateProjectMembers,
  updateSprintStatus,
} from "../api/admin";
import AppShell, { PageHeader, Sidebar, Topbar } from "../components/ui/AppShell";
import { StatusBadge as SurfaceStatusBadge } from "../components/ui/Badges";
import EmptyStatePanel from "../components/ui/EmptyState";
import ClientCard from "../components/clients/ClientCard";
import ClientOnboardingForm from "../components/clients/ClientOnboardingForm";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectOnboardingForm from "../components/projects/ProjectOnboardingForm";
import ProjectWorkspacePage from "../components/projects/ProjectWorkspacePage";
import { isSessionExpiredError } from "../lib/session";

const emptyForms = {
  client: { name: "", email: "", company: "", phone: "", agreement: null },
  member: { name: "", email: "" },
  project: {
    name: "",
    clientEmail: "",
    clientCompany: "",
    status: "planned",
    description: "",
    repositoryUrl: "",
    category: "",
    resources: [],
    planning: [],
    memberIds: [],
  },
  projectTicket: {
    title: "",
    description: "",
    assignedTo: "",
    deadline: "",
    status: "open",
    priority: "medium",
    type: "task",
    urlsText: "",
  },
};

function createPlanningTicket() {
  return {
    title: "",
    outcome: "",
  };
}

function createPlanningSprint() {
  return {
    name: "",
    startDate: "",
    endDate: "",
    outcome: "",
    tickets: [createPlanningTicket()],
  };
}

function createPlanningPhase() {
  return {
    name: "",
    startDate: "",
    endDate: "",
    outcome: "",
    sprints: [createPlanningSprint()],
  };
}

function countPlannedTickets(planning = []) {
  return planning.reduce(
    (total, phase) =>
      total +
      (phase.sprints || []).reduce((sprintTotal, sprint) => sprintTotal + (sprint.tickets?.length || 0), 0),
    0,
  );
}

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

function normalizeStatus(status) {
  return (status || "planned").replaceAll("_", " ");
}

function getInitials(value) {
  return (value || "OD")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getPriorityFromTicket(ticket) {
  if (ticket?.priority) {
    return ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1);
  }

  const normalized = (ticket.status || "").toLowerCase();
  if (normalized === "blocked") {
    return "High";
  }
  if (normalized === "in_progress") {
    return "Medium";
  }
  return "Normal";
}

function percentComplete(project) {
  const phases = project?.planning || [];
  if (!phases.length) {
    return project?.status === "active" ? 25 : 0;
  }

  const completedSprints = phases.reduce(
    (total, phase) =>
      total +
      (phase.sprints || []).filter((sprint) => ["completed", "done", "closed"].includes((sprint.status || "").toLowerCase())).length,
    0,
  );
  const totalSprints = phases.reduce((total, phase) => total + (phase.sprints?.length || 0), 0);
  return totalSprints ? Math.round((completedSprints / totalSprints) * 100) : 0;
}

function AdminDashboard() {
  const [path, setPath] = useState(window.location.pathname);
  const [adminSession, setAdminSession] = useState(getAdminSession());
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAdminSession().token));
  const [currentAdmin, setCurrentAdmin] = useState(getAdminSession().user || null);
  const [forms, setForms] = useState(emptyForms);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTickets, setProjectTickets] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [projectMemberSearch, setProjectMemberSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [memberDirectorySearch, setMemberDirectorySearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [issueSearch, setIssueSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDashboardPath = path === "/" || path === "/admin";
  const isClientsPath = path === "/clients";
  const isMembersPath = path === "/members";
  const isProjectsPath = path === "/projects";
  const isRequestsPath = path === "/requests";
  const isIssuesPath = path === "/issues";
  const isBoardsPath = path === "/boards";
  const isSprintsPath = path === "/sprints";
  const isTeamsPath = path === "/teams";
  const isReportsPath = path === "/reports";
  const isSettingsPath = path === "/settings";
  const isProjectCreatePath = path === "/projects/new";
  const projectIdFromPath = !isProjectCreatePath ? path.match(/^\/projects\/([^/]+)$/)?.[1] || "" : "";

  const activeMembers = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  const invitedMembers = useMemo(() => members.filter((member) => member.status === "invited"), [members]);
  const activeClients = useMemo(() => clients.filter((client) => client.status === "active"), [clients]);
  const invitedClients = useMemo(() => clients.filter((client) => client.status === "invited"), [clients]);
  const activeProjectsCount = useMemo(() => projects.filter((project) => project.status === "active").length, [projects]);

  const searchedProjectMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    const source = search
      ? activeMembers.filter((member) => [member.name, member.email].some((value) => value.toLowerCase().includes(search)))
      : activeMembers;

    return source.slice(0, 12);
  }, [activeMembers, memberSearch]);

  const selectedMembers = useMemo(
    () => activeMembers.filter((member) => selectedMemberIds.includes(member._id)),
    [activeMembers, selectedMemberIds],
  );

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();
    return search
      ? clients.filter((client) =>
          [client.name, client.email, client.company, client.phone].filter(Boolean).some((value) => value.toLowerCase().includes(search)),
        )
      : clients;
  }, [clientSearch, clients]);

  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase();
    return search
      ? projects.filter((project) =>
          [project.name, project.clientEmail, project.description, project.status]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(search)),
        )
      : projects;
  }, [projectSearch, projects]);

  const filteredMembers = useMemo(() => {
    const search = memberDirectorySearch.trim().toLowerCase();
    return search
      ? members.filter((member) => [member.name, member.email, member.status].some((value) => value.toLowerCase().includes(search)))
      : members;
  }, [memberDirectorySearch, members]);

  const filteredRequests = useMemo(() => {
    const search = requestSearch.trim().toLowerCase();
    return search
      ? requests.filter((requestItem) =>
          [
            requestItem.title,
            requestItem.description,
            requestItem.status,
            requestItem.project?.name,
            requestItem.createdBy?.name,
            requestItem.createdBy?.email,
          ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(search)),
        )
      : requests;
  }, [requestSearch, requests]);

  const filteredIssues = useMemo(() => {
    const search = issueSearch.trim().toLowerCase();
    return search
      ? issues.filter((issue) =>
          [issue.title, issue.description, issue.status, issue.project?.name, issue.client?.name, issue.client?.email]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(search)),
        )
      : issues;
  }, [issueSearch, issues]);

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      window.location.replace("/login");
    }
  }, [isLoggedIn]);

  async function loadDashboard() {
    try {
      const [clientData, memberData, projectData, requestData, issueData] = await Promise.all([
        listClients(),
        listMembers(),
        listProjects(),
        listRequests(),
        listIssues(),
      ]);
      setClients(clientData.clients || []);
      setMembers(memberData.members || []);
      setProjects(projectData.projects || []);
      setRequests(requestData.requests || []);
      setIssues(issueData.issues || []);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      if (requestError.message.includes("Authentication") || requestError.message.includes("admin account")) {
        clearAdminSession();
        setAdminSession({});
        setCurrentAdmin(null);
        setIsLoggedIn(false);
        routeTo("/login");
      }
      setError(requestError.message);
    }
  }

  async function loadProject(projectId) {
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const data = await getProject(projectId);
      setSelectedProject(data.project);
      setProjectTickets(data.tickets || []);
      setSelectedMemberIds((data.project.members || []).map((member) => member._id));
      setForms((current) => ({
        ...current,
        projectTicket: {
          ...emptyForms.projectTicket,
          assignedTo: data.project.members?.[0]?._id || "",
        },
      }));
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    async function verifySession() {
      setLoading(true);
      setError("");

      try {
        const data = await getAdminSessionStatus();
        setCurrentAdmin(data.admin || adminSession.user || null);
        await loadDashboard();
      } catch (requestError) {
        if (isSessionExpiredError(requestError)) {
          return;
        }
        clearAdminSession();
        setAdminSession({});
        setCurrentAdmin(null);
        setIsLoggedIn(false);
        setError(requestError.message);
        routeTo("/login");
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, [adminSession.user, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && projectIdFromPath) {
      loadProject(projectIdFromPath);
      return;
    }

    setSelectedProject(null);
    setProjectTickets([]);
    setSelectedMemberIds([]);
  }, [isLoggedIn, projectIdFromPath]);

  useEffect(() => {
    if (["/boards", "/sprints", "/reports"].includes(path)) {
      routeTo("/projects");
    }
  }, [path]);

  useEffect(() => {
    if (isProjectCreatePath) {
      setForms((current) => ({ ...current, project: emptyForms.project }));
      setProjectMemberSearch("");
    }
  }, [isProjectCreatePath]);

  function updateForm(formKey, event) {
    const { files, name, type, value } = event.target;
    setForms((current) => ({
      ...current,
      [formKey]: {
        ...current[formKey],
        [name]: type === "file" ? files[0] || null : value,
      },
    }));
  }

  function updateProjectTicketForm(event) {
    const { name, value } = event.target;
    setForms((current) => ({
      ...current,
      projectTicket: {
        ...current.projectTicket,
        [name]: value,
      },
    }));
  }

  function handleProjectOnboarding(action) {
    if (action.type === "change") {
      setForms((current) => ({
        ...current,
        project: {
          ...current.project,
          [action.name]: action.value,
        },
      }));
      return;
    }

    if (action.type === "toggle-member") {
      setForms((current) => ({
        ...current,
        project: {
          ...current.project,
          memberIds: current.project.memberIds.includes(action.memberId)
            ? current.project.memberIds.filter((memberId) => memberId !== action.memberId)
            : [...current.project.memberIds, action.memberId],
        },
      }));
      return;
    }

    if (action.type === "add-resource") {
      setForms((current) => ({
        ...current,
        project: {
          ...current.project,
          resources: [...current.project.resources, { name: "", url: "" }],
        },
      }));
      return;
    }

    if (action.type === "remove-resource") {
      setForms((current) => ({
        ...current,
        project: {
          ...current.project,
          resources: current.project.resources.filter((_, index) => index !== action.index),
        },
      }));
      return;
    }

    if (action.type === "change-resource") {
      setForms((current) => ({
        ...current,
        project: {
          ...current.project,
          resources: current.project.resources.map((resource, index) =>
            index === action.index ? { ...resource, [action.name]: action.value } : resource,
          ),
        },
      }));
      return;
    }

    if (action.type === "submit") {
      createProject();
    }
  }

  function updateProjectPlanningPhase(phaseIndex, field, value) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex ? { ...phase, [field]: value } : phase,
        ),
      },
    }));
  }

  function updateProjectPlanningSprint(phaseIndex, sprintIndex, field, value) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex
            ? {
                ...phase,
                sprints: phase.sprints.map((sprint, currentSprintIndex) =>
                  currentSprintIndex === sprintIndex ? { ...sprint, [field]: value } : sprint,
                ),
              }
            : phase,
        ),
      },
    }));
  }

  function updateProjectPlanningTicket(phaseIndex, sprintIndex, ticketIndex, field, value) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex
            ? {
                ...phase,
                sprints: phase.sprints.map((sprint, currentSprintIndex) =>
                  currentSprintIndex === sprintIndex
                    ? {
                        ...sprint,
                        tickets: sprint.tickets.map((ticket, currentTicketIndex) =>
                          currentTicketIndex === ticketIndex ? { ...ticket, [field]: value } : ticket,
                        ),
                      }
                    : sprint,
                ),
              }
            : phase,
        ),
      },
    }));
  }

  function addProjectPlanningPhase() {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: [...current.project.planning, createPlanningPhase()],
      },
    }));
  }

  function removeProjectPlanningPhase(phaseIndex) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.filter((_, currentPhaseIndex) => currentPhaseIndex !== phaseIndex),
      },
    }));
  }

  function addProjectPlanningSprint(phaseIndex) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex ? { ...phase, sprints: [...phase.sprints, createPlanningSprint()] } : phase,
        ),
      },
    }));
  }

  function removeProjectPlanningSprint(phaseIndex, sprintIndex) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex
            ? { ...phase, sprints: phase.sprints.filter((_, currentSprintIndex) => currentSprintIndex !== sprintIndex) }
            : phase,
        ),
      },
    }));
  }

  function addProjectPlanningTicket(phaseIndex, sprintIndex) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex
            ? {
                ...phase,
                sprints: phase.sprints.map((sprint, currentSprintIndex) =>
                  currentSprintIndex === sprintIndex
                    ? { ...sprint, tickets: [...sprint.tickets, createPlanningTicket()] }
                    : sprint,
                ),
              }
            : phase,
        ),
      },
    }));
  }

  function removeProjectPlanningTicket(phaseIndex, sprintIndex, ticketIndex) {
    setForms((current) => ({
      ...current,
      project: {
        ...current.project,
        planning: current.project.planning.map((phase, currentPhaseIndex) =>
          currentPhaseIndex === phaseIndex
            ? {
                ...phase,
                sprints: phase.sprints.map((sprint, currentSprintIndex) =>
                  currentSprintIndex === sprintIndex
                    ? { ...sprint, tickets: sprint.tickets.filter((_, currentTicketIndex) => currentTicketIndex !== ticketIndex) }
                    : sprint,
                ),
              }
            : phase,
        ),
      },
    }));
  }

  async function handleCreate(formKey, handler, nextPath) {
    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await handler(forms[formKey]);
      setStatus(data.message);
      setForms((current) => ({ ...current, [formKey]: emptyForms[formKey] }));
      await loadDashboard();
      routeTo(nextPath);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    setLoading(true);
    setStatus("");
    setError("");

    try {
      const payload = {
        ...forms.project,
        name: forms.project.name.trim(),
        description: forms.project.description.trim(),
        repositoryUrl: forms.project.repositoryUrl.trim(),
        clientCompany: forms.project.clientCompany.trim(),
        resources: forms.project.resources.map((resource) => ({
          name: resource.name.trim(),
          url: resource.url.trim(),
        })),
      };

      const data = await addProject(payload);
      setStatus(data.message);
      setForms((current) => ({ ...current, project: emptyForms.project }));
      setProjectMemberSearch("");
      await loadDashboard();
      routeTo("/projects");
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleProjectMember(memberId) {
    setSelectedMemberIds((current) =>
      current.includes(memberId) ? current.filter((selectedId) => selectedId !== memberId) : [...current, memberId],
    );
  }

  async function saveProjectMembers() {
    if (!selectedProject) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await updateProjectMembers(selectedProject._id, selectedMemberIds);
      setSelectedProject(data.project);
      setSelectedMemberIds((data.project.members || []).map((member) => member._id));
      setStatus(data.message);
      await loadDashboard();
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function createAdminProjectTicket(ticketPayload, onSuccess) {
    if (!selectedProject) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const urls = ticketPayload.urlsText
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean);

      const data = await addProjectTicket(selectedProject._id, {
        title: ticketPayload.title,
        description: ticketPayload.description,
        assignedTo: ticketPayload.assignedTo,
        deadline: ticketPayload.deadline,
        status: "open",
        priority: ticketPayload.priority,
        type: ticketPayload.type,
        urls,
      });

      setProjectTickets((current) => [data.ticket, ...current]);
      setForms((current) => ({
        ...current,
        projectTicket: {
          ...emptyForms.projectTicket,
          assignedTo: selectedProject.members?.[0]?._id || "",
        },
      }));
      setStatus(data.message);
      if (onSuccess) {
        onSuccess();
      }
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProjectResources(resources) {
    if (!selectedProject) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await addProjectResources(selectedProject._id, resources);
      setSelectedProject(data.project);
      setStatus(data.message);
      await loadDashboard();
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSprintStatusChange(phaseIndex, sprintIndex, statusValue) {
    if (!selectedProject) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await updateSprintStatus(selectedProject._id, phaseIndex, sprintIndex, statusValue);
      setSelectedProject(data.project);
      setStatus(data.message);
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function logoutAdmin() {
    clearAdminSession();
    setAdminSession({});
    setIsLoggedIn(false);
    setCurrentAdmin(null);
    setStatus("");
    setError("");
    routeTo("/login");
  }

  if (!isLoggedIn) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Projects", path: "/projects" },
    { label: "Tickets", path: "/issues" },
    { label: "Members", path: "/members" },
    { label: "Clients", path: "/clients" },
    { label: "Settings", path: "/settings" },
  ];

  let pageMeta = {
    eyebrow: "Operations Overview",
    title: "Project delivery control with a cleaner admin surface",
    description: "Manage projects, assignments, tickets, and stakeholders from a simplified SaaS-style workspace.",
  };

  if (isProjectCreatePath) {
    pageMeta = {
      eyebrow: "Projects",
      title: "Onboard a new project",
      description: "Set up the project workspace, key metadata, and initial assignees without planning-heavy workflow setup.",
    };
  } else if (path === "/clients/onboard") {
    pageMeta = {
      eyebrow: "Clients",
      title: "Onboard a new client",
      description: "Create a polished stakeholder profile with contact details and agreement handling in one clean flow.",
    };
  } else if (isClientsPath) {
    pageMeta = {
      eyebrow: "Clients",
      title: "Client directory",
      description: "Track stakeholder accounts, agreement status, and client contact details from a single view.",
    };
  } else if (projectIdFromPath) {
    pageMeta = {
      eyebrow: "Projects",
      title: "Project workspace",
      description: "Review project details, manage members, and raise tickets from one clean workspace.",
    };
  } else if (isProjectsPath) {
    pageMeta = {
      eyebrow: "Projects",
      title: "Project portfolio",
      description: "Browse active client workspaces and open the details that need attention.",
    };
  } else if (isIssuesPath) {
    pageMeta = {
      eyebrow: "Tickets",
      title: "Ticket queue",
      description: "Monitor current issues and requests across your workspace.",
    };
  }

  return (
    <AppShell
      sidebar={(
        <Sidebar>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
              OD
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">OrbitDesk Admin</p>
              <p className="muted-text text-xs">Work management command center</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item, index) => {
              const isActive =
                path === item.path ||
                (item.path === "/projects" && path.startsWith("/projects")) ||
                (item.path === "/issues" && path.startsWith("/issues")) ||
                (item.path === "/members" && path.startsWith("/members")) ||
                (item.path === "/clients" && path.startsWith("/clients")) ||
                (item.path === "/settings" && path.startsWith("/settings"));

              return (
                <button className={`sidebar-link w-full justify-between ${isActive ? "sidebar-link-active" : ""}`} key={item.path} onClick={() => routeTo(item.path)} type="button">
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </span>
                </button>
              );
            })}
            <button className={`sidebar-link w-full justify-between ${isRequestsPath ? "sidebar-link-active" : ""}`} onClick={() => routeTo("/requests")} type="button">
              <span className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">06</span>
                Requests
              </span>
            </button>
          </nav>

          <div className="surface-muted mt-8 p-4">
            <p className="text-sm font-semibold text-slate-900">{currentAdmin?.name || "Admin workspace"}</p>
            <p className="muted-text mt-1 text-sm">{currentAdmin?.email || "Operations owner"}</p>
          </div>
        </Sidebar>
      )}
      topbar={
        isDashboardPath ? (
          <Topbar>
            <PageHeader
              actions={
                <>
                  <button className="primary-button" onClick={() => routeTo("/projects/new")} type="button">
                    New project
                  </button>
                  <button className="secondary-button" onClick={() => routeTo("/clients/onboard")} type="button">
                    Onboard client
                  </button>
                  <button className="secondary-button" onClick={() => routeTo("/members/new")} type="button">
                    Add member
                  </button>
                  <button className="secondary-button" onClick={loadDashboard} type="button">
                    Refresh
                  </button>
                  <button className="secondary-button" onClick={logoutAdmin} type="button">
                    Logout
                  </button>
                </>
              }
              description={pageMeta.description}
              eyebrow={pageMeta.eyebrow}
              title={pageMeta.title}
            />
            {status ? <p className="status-success mt-5">{status}</p> : null}
            {error ? <p className="status-error mt-5">{error}</p> : null}
          </Topbar>
        ) : null
      }
    >
          {!isDashboardPath && status ? <p className="status-success mt-6">{status}</p> : null}
          {!isDashboardPath && error ? <p className="status-error mt-6">{error}</p> : null}


          {path === "/clients/onboard" ? (
            <ClientOnboardingForm
              clients={filteredClients}
              form={forms.client}
              loading={loading}
              onBack={() => routeTo("/clients")}
              onChange={(event) => {
                updateForm("client", event);
              }}
              onSubmit={() => handleCreate("client", addClient, "/clients")}
            />
          ) : null}

          {path === "/members/new" ? (
            <MemberCreatePage
              form={forms.member}
              loading={loading}
              onBack={() => routeTo("/members")}
              onChange={(event) => updateForm("member", event)}
              onSubmit={() => handleCreate("member", addMember, "/members")}
            />
          ) : null}

          {isProjectCreatePath ? (
            <ProjectOnboardingForm
              clients={activeClients}
              form={forms.project}
              loading={loading}
              memberSearch={projectMemberSearch}
              onBack={() => routeTo("/projects")}
              onMemberSearch={setProjectMemberSearch}
              onSubmit={handleProjectOnboarding}
              members={activeMembers}
            />
          ) : null}

          {projectIdFromPath ? (
            <ProjectWorkspacePage
              key={selectedProject?._id || projectIdFromPath}
              loading={loading}
              onAddResources={saveProjectResources}
              memberSearch={memberSearch}
              onBack={() => routeTo("/projects")}
              onCreateTicket={createAdminProjectTicket}
              onSaveMembers={saveProjectMembers}
              onSearchMembers={setMemberSearch}
              onToggleMember={toggleProjectMember}
              project={selectedProject}
              searchedMembers={searchedProjectMembers}
              selectedMemberIds={selectedMemberIds}
              selectedMembers={selectedMembers}
              tickets={projectTickets}
            />
          ) : null}

          {isDashboardPath ? (
            <DashboardHome
              activeClients={activeClients.length}
              activeMembers={activeMembers.length}
              activeProjectsCount={activeProjectsCount}
              clients={filteredClients}
              invitedClients={invitedClients.length}
              invitedMembers={invitedMembers.length}
              issues={filteredIssues}
              members={filteredMembers}
              projects={filteredProjects}
              requests={filteredRequests}
              totalClients={clients.length}
              totalIssues={issues.length}
              totalMembers={members.length}
              totalProjects={projects.length}
              totalRequests={requests.length}
            />
          ) : null}

          {isTeamsPath ? <TeamPage clients={clients} members={members} projects={projects} /> : null}
          {isSettingsPath ? <SettingsPage clients={clients} members={members} /> : null}

          {isClientsPath ? (
            <ClientsPage clients={filteredClients} searchValue={clientSearch} onSearch={setClientSearch} />
          ) : null}

          {isMembersPath ? (
            <MembersPage members={filteredMembers} searchValue={memberDirectorySearch} onSearch={setMemberDirectorySearch} />
          ) : null}

          {isProjectsPath ? (
            <ProjectsPage projects={filteredProjects} searchValue={projectSearch} onSearch={setProjectSearch} />
          ) : null}

          {isRequestsPath ? (
            <RequestsPage requests={filteredRequests} searchValue={requestSearch} onSearch={setRequestSearch} />
          ) : null}

          {isIssuesPath ? (
            <IssuesPage issues={filteredIssues} searchValue={issueSearch} onSearch={setIssueSearch} />
          ) : null}
    </AppShell>
  );
}

function DashboardHome({
  activeClients,
  activeMembers,
  activeProjectsCount,
  clients,
  invitedClients,
  invitedMembers,
  issues,
  members,
  projects,
  requests,
  totalClients,
  totalIssues,
  totalMembers,
  totalProjects,
  totalRequests,
}) {
  const overdueTasks = issues.filter((issue) => issue.deadline && new Date(issue.deadline) < new Date()).length;
  const recentUpdates = [...requests, ...issues].slice(0, 5);

  return (
    <div className="mt-6 space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total projects" value={totalProjects} note={`${activeProjectsCount} active right now`} onClick={() => routeTo("/projects")} />
        <MetricCard label="Open issues" value={totalIssues} note="Client-visible issue queue" onClick={() => routeTo("/issues")} />
        <MetricCard label="Completed tasks" value={projects.filter((project) => project.status === "completed").length} note="Projects fully delivered" onClick={() => routeTo("/projects")} />
        <MetricCard label="Overdue tasks" value={overdueTasks} note="Needs attention today" onClick={() => routeTo("/issues")} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="surface-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2 className="section-title mt-3">Project progress cards</h2>
            </div>
            <button className="secondary-button" onClick={() => routeTo("/projects")} type="button">
              Manage projects
            </button>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <button className="surface-muted w-full p-5 text-left hover:border-violet-200 hover:shadow-md" key={project._id} onClick={() => routeTo(`/projects/${project._id}`)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                    <p className="muted-text mt-2 text-sm">{project.clientEmail || "No client assigned"}</p>
                  </div>
                  <span className="badge badge-primary">{normalizeStatus(project.status)}</span>
                </div>
                <p className="muted-text mt-3 text-sm">{project.description || "No description provided."}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">Progress</span>
                  <span className="muted-text">{percentComplete(project)}%</span>
                </div>
                <div className="progress-track mt-2">
                  <div className="progress-fill" style={{ width: `${percentComplete(project)}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <article className="surface-card p-6">
            <p className="eyebrow">Teams</p>
            <h2 className="section-title mt-3 text-xl">Workspace pulse</h2>
            <div className="mt-5 grid gap-3">
              <CompactStat label="Clients" value={`${activeClients} active / ${invitedClients} invited`} onClick={() => routeTo("/clients")} />
              <CompactStat label="Members" value={`${activeMembers} active / ${invitedMembers} invited`} onClick={() => routeTo("/members")} />
              <CompactStat label="Requests" value={`${totalRequests} open collaboration items`} onClick={() => routeTo("/requests")} />
              <CompactStat label="Issues" value={`${issues.filter((issue) => issue.status === "open").length} open issue reports`} onClick={() => routeTo("/issues")} />
            </div>
          </article>

          <article className="surface-card p-6">
            <p className="eyebrow">Recent Updates</p>
            <h2 className="section-title mt-3 text-xl">Priority items</h2>
            <div className="mt-5 space-y-3">
              {recentUpdates.map((item) => (
                <button className="surface-muted w-full p-4 text-left hover:border-violet-200" key={item._id} onClick={() => routeTo(item.createdBy ? "/requests" : "/issues")} type="button">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="muted-text mt-1 text-sm">{item.project?.name || item.client?.name || "Workspace item"}</p>
                    </div>
                    <span className="badge badge-info">{normalizeStatus(item.status || "open")}</span>
                  </div>
                </button>
              ))}
              {!recentUpdates.length ? <EmptyState copy="No recent updates yet." /> : null}
            </div>
          </article>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <QuickTable title="Client visibility" rows={clients.slice(0, 5)} columns={[["Name", "name"], ["Company", "company"], ["Status", "status"]]} onClick={() => routeTo("/clients")} />
        <QuickTable title="Team activity" rows={members.slice(0, 5)} columns={[["Member", "name"], ["Email", "email"], ["Status", "status"]]} onClick={() => routeTo("/members")} />
        <QuickTable title="Open requests" rows={requests.slice(0, 5)} columns={[["Title", "title"], ["Project", "project.name"], ["Status", "status"]]} onClick={() => routeTo("/requests")} />
      </div>
    </div>
  );
}

function BoardPage({ issues, projects, requests }) {
  const derivedTasks = [
    ...issues.map((issue) => ({
      id: issue._id,
      title: issue.title,
      description: issue.description,
      status: issue.status || "backlog",
      owner: issue.client?.name || issue.client?.email || "Client",
      dueDate: issue.createdAt,
      tag: issue.project?.name || "Issue",
      priority: "High",
    })),
    ...requests.map((requestItem) => ({
      id: requestItem._id,
      title: requestItem.title,
      description: requestItem.description,
      status: requestItem.status || "to_do",
      owner: requestItem.createdBy?.name || "Member",
      dueDate: requestItem.createdAt,
      tag: requestItem.project?.name || "Request",
      priority: "Medium",
    })),
    ...projects.map((project) => ({
      id: project._id,
      title: project.name,
      description: project.description,
      status: project.status === "completed" ? "done" : project.status === "active" ? "in_progress" : "backlog",
      owner: project.clientEmail || "Unassigned",
      dueDate: project.updatedAt || project.createdAt,
      tag: "Project",
      priority: "Normal",
    })),
  ];

  const columns = [
    { key: "backlog", label: "Backlog" },
    { key: "to_do", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "in_review", label: "In Review" },
    { key: "done", label: "Done" },
  ];

  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Boards</p>
          <h2 className="section-title mt-3">Kanban-style workspace board</h2>
        </div>
        <span className="glass-chip">{derivedTasks.length} items</span>
      </div>
      <div className="board-scroll mt-6">
        <div className="board-grid">
          {columns.map((column) => {
            const items = derivedTasks.filter((task) => {
              if (column.key === "backlog") {
                return ["planned", "open", "backlog"].includes((task.status || "").toLowerCase());
              }
              if (column.key === "to_do") {
                return ["to_do"].includes((task.status || "").toLowerCase());
              }
              if (column.key === "in_progress") {
                return ["active", "in_progress"].includes((task.status || "").toLowerCase());
              }
              if (column.key === "in_review") {
                return ["in_review", "review"].includes((task.status || "").toLowerCase());
              }
              return ["done", "completed", "resolved"].includes((task.status || "").toLowerCase());
            });

            return (
              <div className="kanban-column" key={column.key}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{column.label}</h3>
                  <span className="glass-chip">{items.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {items.map((task) => (
                    <article className="task-card" key={task.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">{task.title}</h4>
                          <p className="muted-text mt-1 text-sm">{task.description || "No description provided."}</p>
                        </div>
                        <span className={`badge ${task.priority === "High" ? "badge-danger" : task.priority === "Medium" ? "badge-warning" : "badge-info"}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="glass-chip">{task.tag}</span>
                        <span className="avatar-badge">{getInitials(task.owner)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{task.owner}</span>
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    </article>
                  ))}
                  {!items.length ? <div className="surface-muted p-4 text-sm text-slate-500">No tasks in this column.</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SprintsPage({ projects }) {
  return (
    <section className="surface-card mt-6 p-6">
      <p className="eyebrow">Sprints</p>
      <h2 className="section-title mt-3">Sprint status management</h2>
      <div className="mt-6 space-y-4">
        {projects.map((project) => (
          <article className="surface-muted p-5" key={project._id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                <p className="muted-text mt-1 text-sm">{project.clientEmail || "No client assigned"}</p>
              </div>
              <span className="badge badge-primary">{countPlannedTickets(project.planning)} planned items</span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {(project.planning || []).flatMap((phase, phaseIndex) =>
                (phase.sprints || []).map((sprint, sprintIndex) => (
                  <div className="surface-card p-4" key={`${project._id}-${phaseIndex}-${sprintIndex}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{phase.name || `Phase ${phaseIndex + 1}`}</p>
                        <h4 className="mt-2 font-semibold text-slate-900">{sprint.name || `Sprint ${sprintIndex + 1}`}</h4>
                      </div>
                      <span className="badge badge-info">{normalizeStatus(sprint.status || "planned")}</span>
                    </div>
                    <p className="muted-text mt-3 text-sm">{sprint.outcome || "No sprint outcome defined."}</p>
                  </div>
                )),
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamPage({ clients, members, projects }) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="surface-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">User Management</p>
            <h2 className="section-title mt-3">Members and roles</h2>
          </div>
          <button className="secondary-button" onClick={() => routeTo("/members")} type="button">
            Open member directory
          </button>
        </div>
        <div className="table-shell mt-6">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Assigned Projects</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar-badge">{getInitials(member.name)}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="muted-text text-sm">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={member.status} /></td>
                    <td>{projects.filter((project) => (project.members || []).some((item) => item._id === member._id)).length}</td>
                    <td><span className="badge badge-primary">Contributor</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <article className="surface-card p-6">
          <p className="eyebrow">Permissions</p>
          <h2 className="section-title mt-3 text-xl">Role and permission management</h2>
          <div className="mt-5 space-y-3">
            {[
              ["Workspace Admin", "Full portfolio access, sprint control, user management"],
              ["Project Lead", "Can manage project members, backlog, and project tickets"],
              ["Contributor", "Can update tasks, collaborate, and raise requests"],
            ].map(([role, note]) => (
              <div className="surface-muted p-4" key={role}>
                <p className="font-semibold text-slate-900">{role}</p>
                <p className="muted-text mt-2 text-sm">{note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card p-6">
          <p className="eyebrow">Client Access</p>
          <h2 className="section-title mt-3 text-xl">Workspace stakeholders</h2>
          <div className="mt-5 space-y-3">
            {clients.slice(0, 4).map((client) => (
              <div className="surface-muted flex items-center justify-between gap-3 p-4" key={client._id}>
                <div>
                  <p className="font-semibold text-slate-900">{client.name}</p>
                  <p className="muted-text text-sm">{client.company || client.email}</p>
                </div>
                <StatusBadge status={client.status} />
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function ReportsPage({ issues, members, projects, requests }) {
  const completedProjects = projects.filter((project) => project.status === "completed").length;
  const responseLoad = Math.max(1, Math.round((requests.length + issues.length) / Math.max(1, members.length)));

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <article className="surface-card p-6">
        <p className="eyebrow">System Analytics</p>
        <h2 className="section-title mt-3">Operational metrics</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <MetricCard label="Completed projects" value={completedProjects} note="Delivered to clients" />
          <MetricCard label="Open requests" value={requests.filter((item) => item.status === "open").length} note="Needs admin action" />
          <MetricCard label="Issue load per member" value={responseLoad} note="Approximate workload signal" />
          <MetricCard label="Active delivery team" value={members.filter((member) => member.status === "active").length} note="Available contributors" />
        </div>
      </article>

      <article className="surface-card p-6">
        <p className="eyebrow">Recent Signals</p>
        <h2 className="section-title mt-3">Queue health</h2>
        <div className="mt-5 space-y-3">
          {[...issues.slice(0, 3), ...requests.slice(0, 3)].map((item) => (
            <div className="surface-muted flex items-start justify-between gap-3 p-4" key={item._id}>
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="muted-text mt-1 text-sm">{item.project?.name || "Workspace item"}</p>
              </div>
              <span className="badge badge-info">{normalizeStatus(item.status || "open")}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function SettingsPage({ clients, members }) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <article className="surface-card p-6">
        <p className="eyebrow">Workspace Settings</p>
        <h2 className="section-title mt-3">Configuration overview</h2>
        <div className="mt-5 space-y-3">
          <SettingRow label="Active members" value={members.filter((member) => member.status === "active").length} />
          <SettingRow label="Active clients" value={clients.filter((client) => client.status === "active").length} />
          <SettingRow label="Primary board style" value="Kanban delivery board" />
          <SettingRow label="Notification mode" value="Email + in-app placeholders" />
        </div>
      </article>

      <article className="surface-card p-6">
        <p className="eyebrow">Admin Notes</p>
        <h2 className="section-title mt-3">Planned configuration modules</h2>
        <div className="mt-5 space-y-3">
          {[
            "Workspace branding and domain settings",
            "Automation rules for issue routing",
            "SLA targets and escalation policies",
            "Role-based permission templates",
          ].map((item) => (
            <div className="surface-muted p-4" key={item}>
              <p className="text-sm font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function ClientsPage({ clients, onSearch, searchValue }) {
  const activeCount = clients.filter((client) => client.status === "active").length;
  const invitedCount = clients.filter((client) => client.status === "invited").length;
  const agreementsCount = clients.filter((client) => client.agreementDocument?.url).length;

  return (
    <DirectoryPage actionLabel="Onboard client" countLabel={`${clients.length} total`} onAction={() => routeTo("/clients/onboard")} onSearch={onSearch} searchPlaceholder="Search clients" searchValue={searchValue} title="Clients">
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <CompactStat label="Active clients" value={activeCount} />
        <CompactStat label="Invited clients" value={invitedCount} />
        <CompactStat label="Agreements uploaded" value={agreementsCount} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {clients.map((client) => (
          <ClientCard client={client} key={client._id} />
        ))}
      </div>

      {!clients.length ? (
        <EmptyStatePanel
          action={
            <button className="primary-button" onClick={() => routeTo("/clients/onboard")} type="button">
              Onboard first client
            </button>
          }
          className="mt-6"
          copy="Create the first client profile to manage stakeholders, agreements, and project relationships."
          title="No clients yet"
        />
      ) : null}
    </DirectoryPage>
  );
}

function MembersPage({ members, onSearch, searchValue }) {
  return (
    <DirectoryPage actionLabel="Add member" countLabel={`${members.length} total`} onAction={() => routeTo("/members/new")} onSearch={onSearch} searchPlaceholder="Search members" searchValue={searchValue} title="User Management">
      <div className="table-shell mt-6">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Invited</th>
                <th>Password Set</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="avatar-badge">{getInitials(member.name)}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="muted-text text-sm">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={member.status} /></td>
                  <td>{formatDate(member.invitedAt)}</td>
                  <td>{formatDate(member.passwordSetAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DirectoryPage>
  );
}

function ProjectsPage({ projects, onSearch, searchValue }) {
  return (
    <DirectoryPage actionLabel="New project" countLabel={`${projects.length} total`} onAction={() => routeTo("/projects/new")} onSearch={onSearch} searchPlaceholder="Search projects" searchValue={searchValue} title="Projects">
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project._id} onOpen={() => routeTo(`/projects/${project._id}`)} project={project} />
        ))}
      </div>
      {!projects.length ? (
        <EmptyStatePanel
          action={
            <button className="primary-button" onClick={() => routeTo("/projects/new")} type="button">
              Create project
            </button>
          }
          className="mt-6"
          copy="Set up your first project workspace to start raising and tracking tickets."
          title="No projects yet"
        />
      ) : null}
    </DirectoryPage>
  );
}

function RequestsPage({ requests, onSearch, searchValue }) {
  return (
    <DirectoryPage countLabel={`${requests.length} total`} onSearch={onSearch} searchPlaceholder="Search requests" searchValue={searchValue} title="Requests">
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {requests.map((requestItem) => (
          <article className="surface-muted p-5" key={requestItem._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{requestItem.title}</h3>
                <p className="muted-text mt-1 text-sm">{requestItem.project?.name || "Project"}</p>
              </div>
              <StatusBadge status={requestItem.status} />
            </div>
            <p className="muted-text mt-3 text-sm">{requestItem.description || "No description"}</p>
            <p className="muted-text mt-3 text-sm">Raised by {requestItem.createdBy?.name || "-"}</p>
          </article>
        ))}
      </div>
    </DirectoryPage>
  );
}

function IssuesPage({ issues, onSearch, searchValue }) {
  return (
    <DirectoryPage countLabel={`${issues.length} total`} onSearch={onSearch} searchPlaceholder="Search tickets" searchValue={searchValue} title="Tickets">
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {issues.map((issue) => (
          <article className="surface-muted p-5" key={issue._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{issue.title}</h3>
                <p className="muted-text mt-1 text-sm">{issue.project?.name || "Project"}</p>
              </div>
              <StatusBadge status={issue.status} />
            </div>
            <p className="muted-text mt-3 text-sm">{issue.description || "No description"}</p>
            <p className="muted-text mt-3 text-sm">Client: {issue.client?.name || issue.client?.email || "-"}</p>
          </article>
        ))}
      </div>
    </DirectoryPage>
  );
}

function DirectoryPage({ actionLabel, children, countLabel, onAction, onSearch, searchPlaceholder, searchValue, title }) {
  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">{title}</p>
          <h2 className="section-title mt-3">{title}</h2>
          <p className="muted-text mt-2 text-sm">{countLabel}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input-field mt-0 sm:min-w-[320px]" onChange={(event) => onSearch?.(event.target.value)} placeholder={searchPlaceholder} value={searchValue || ""} />
          {actionLabel ? <button className="primary-button" onClick={onAction} type="button">{actionLabel}</button> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function MemberCreatePage({ form, loading, onBack, onChange, onSubmit }) {
  return (
    <FormPage title="Add member" description="Invite a new team member into the delivery workspace." onBack={onBack} onSubmit={onSubmit} loading={loading} submitLabel="Create member">
      <label className="block text-sm font-semibold text-slate-900">Name<input className="input-field" name="name" onChange={onChange} required value={form.name} /></label>
      <label className="block text-sm font-semibold text-slate-900">Email<input className="input-field" name="email" onChange={onChange} required type="email" value={form.email} /></label>
    </FormPage>
  );
}

function ProjectCreatePage({
  form,
  loading,
  onAddPhase,
  onAddSprint,
  onAddTicket,
  onBack,
  onChange,
  onPhaseChange,
  onRemovePhase,
  onRemoveSprint,
  onRemoveTicket,
  onSprintChange,
  onSubmit,
  onTicketChange,
}) {
  return (
    <section className="surface-card mt-6 p-6">
      <button className="secondary-button" onClick={onBack} type="button">
        Back to projects
      </button>
      <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="surface-muted p-5" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <p className="eyebrow">Project Setup</p>
          <h2 className="section-title mt-3">Create a new workspace</h2>
          <label className="mt-5 block text-sm font-semibold text-slate-900">Project name<input className="input-field" name="name" onChange={onChange} required value={form.name} /></label>
          <label className="mt-4 block text-sm font-semibold text-slate-900">Client email<input className="input-field" name="clientEmail" onChange={onChange} type="email" value={form.clientEmail} /></label>
          <label className="mt-4 block text-sm font-semibold text-slate-900">Status<select className="input-field" name="status" onChange={onChange} value={form.status}><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
          <label className="mt-4 block text-sm font-semibold text-slate-900">Description<textarea className="input-field min-h-28" name="description" onChange={onChange} value={form.description} /></label>
          <button className="primary-button mt-5 w-full" disabled={loading} type="submit">{loading ? "Saving..." : "Create project"}</button>
        </form>

        <section className="surface-muted p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Planning</p>
              <h2 className="section-title mt-3">Phases, sprints, and planned items</h2>
            </div>
            <button className="secondary-button" onClick={onAddPhase} type="button">Add phase</button>
          </div>
          <div className="mt-5 space-y-4">
            {form.planning.map((phase, phaseIndex) => (
              <article className="surface-card p-4" key={`phase-${phaseIndex}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">Phase {phaseIndex + 1}</h3>
                  <button className="secondary-button px-3 py-2" onClick={() => onRemovePhase(phaseIndex)} type="button">Remove</button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input className="input-field mt-0" placeholder="Phase name" value={phase.name} onChange={(event) => onPhaseChange(phaseIndex, "name", event.target.value)} />
                  <input className="input-field mt-0" type="date" value={phase.startDate} onChange={(event) => onPhaseChange(phaseIndex, "startDate", event.target.value)} />
                  <input className="input-field mt-0" type="date" value={phase.endDate} onChange={(event) => onPhaseChange(phaseIndex, "endDate", event.target.value)} />
                  <textarea className="input-field mt-0 min-h-24 md:col-span-2" placeholder="Phase outcome" value={phase.outcome} onChange={(event) => onPhaseChange(phaseIndex, "outcome", event.target.value)} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-slate-900">Sprints</h4>
                  <button className="secondary-button px-3 py-2" onClick={() => onAddSprint(phaseIndex)} type="button">Add sprint</button>
                </div>
                <div className="mt-4 space-y-3">
                  {phase.sprints.map((sprint, sprintIndex) => (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4" key={`sprint-${phaseIndex}-${sprintIndex}`}>
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="font-semibold text-slate-900">Sprint {sprintIndex + 1}</h5>
                        <button className="secondary-button px-3 py-2" onClick={() => onRemoveSprint(phaseIndex, sprintIndex)} type="button">Remove</button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input className="input-field mt-0" placeholder="Sprint name" value={sprint.name} onChange={(event) => onSprintChange(phaseIndex, sprintIndex, "name", event.target.value)} />
                        <input className="input-field mt-0" type="date" value={sprint.startDate} onChange={(event) => onSprintChange(phaseIndex, sprintIndex, "startDate", event.target.value)} />
                        <input className="input-field mt-0" type="date" value={sprint.endDate} onChange={(event) => onSprintChange(phaseIndex, sprintIndex, "endDate", event.target.value)} />
                        <textarea className="input-field mt-0 min-h-24 md:col-span-2" placeholder="Sprint outcome" value={sprint.outcome} onChange={(event) => onSprintChange(phaseIndex, sprintIndex, "outcome", event.target.value)} />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <h6 className="font-semibold text-slate-900">Planned items</h6>
                        <button className="secondary-button px-3 py-2" onClick={() => onAddTicket(phaseIndex, sprintIndex)} type="button">Add item</button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {sprint.tickets.map((ticket, ticketIndex) => (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={`ticket-${phaseIndex}-${sprintIndex}-${ticketIndex}`}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-slate-900">Item {ticketIndex + 1}</p>
                              <button className="secondary-button px-3 py-2" onClick={() => onRemoveTicket(phaseIndex, sprintIndex, ticketIndex)} type="button">Remove</button>
                            </div>
                            <input className="input-field mt-3" placeholder="Item title" value={ticket.title} onChange={(event) => onTicketChange(phaseIndex, sprintIndex, ticketIndex, "title", event.target.value)} />
                            <textarea className="input-field min-h-20" placeholder="Planned outcome" value={ticket.outcome} onChange={(event) => onTicketChange(phaseIndex, sprintIndex, ticketIndex, "outcome", event.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!form.planning.length ? <EmptyState copy="No planning yet. Add your first phase to define delivery." /> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function ProjectDetailPage({
  adminTicketForm,
  loading,
  memberSearch,
  onBack,
  onCreateTicket,
  onSaveMembers,
  onSearchMembers,
  onSprintStatusChange,
  onTicketFormChange,
  onToggleMember,
  project,
  searchedMembers,
  selectedMemberIds,
  selectedMembers,
  tickets,
}) {
  if (!project) {
    return <section className="surface-card mt-6 p-6 text-sm text-slate-500">Loading project...</section>;
  }

  const boardColumns = [
    { key: "open", label: "Backlog" },
    { key: "to_do", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "in_review", label: "In Review" },
    { key: "done", label: "Done" },
  ];

  return (
    <section className="surface-card mt-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button className="secondary-button" onClick={onBack} type="button">Back to projects</button>
          <p className="eyebrow mt-5">Project Workspace</p>
          <h2 className="section-title mt-3">{project.name}</h2>
          <p className="muted-text mt-3 max-w-3xl text-sm leading-6">{project.description || "No project description provided."}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactStat label="Client" value={project.clientEmail || "-"} />
          <CompactStat label="Progress" value={`${percentComplete(project)}%`} />
          <CompactStat label="Members" value={project.members?.length || 0} />
          <CompactStat label="Planned" value={countPlannedTickets(project.planning)} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Issue detail style project summary</h3>
                <p className="muted-text mt-2 text-sm">Two-column project view with planning, collaboration, and metadata controls.</p>
              </div>
              <StatusBadge status={project.status} />
            </div>

            <div className="mt-5 space-y-4">
              {(project.planning || []).map((phase, phaseIndex) => (
                <article className="surface-card p-4" key={`${project._id}-${phaseIndex}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phase {phaseIndex + 1}</p>
                      <h4 className="mt-2 font-semibold text-slate-900">{phase.name || `Phase ${phaseIndex + 1}`}</h4>
                    </div>
                    <span className="badge badge-info">{formatDate(phase.endDate)}</span>
                  </div>
                  <p className="muted-text mt-3 text-sm">{phase.outcome || "No phase outcome defined."}</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {(phase.sprints || []).map((sprint, sprintIndex) => (
                      <div className="rounded-xl border border-slate-200 bg-white p-4" key={`${phaseIndex}-${sprintIndex}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{sprint.name || `Sprint ${sprintIndex + 1}`}</p>
                            <p className="muted-text mt-1 text-sm">{sprint.outcome || "No sprint outcome defined."}</p>
                          </div>
                          <select className="input-field mt-0 w-auto min-w-[150px]" onChange={(event) => onSprintStatusChange(phaseIndex, sprintIndex, event.target.value)} value={sprint.status || "planned"}>
                            <option value="planned">Planned</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Board</h3>
                <p className="muted-text mt-2 text-sm">Task cards are styled as draggable-ready items.</p>
              </div>
              <span className="glass-chip">{tickets.length}</span>
            </div>
            <div className="board-scroll mt-5">
              <div className="board-grid">
                {boardColumns.map((column) => {
                  const columnItems = tickets.filter((ticket) => {
                    const normalized = (ticket.status || "").toLowerCase();
                    if (column.key === "open") {
                      return ["open", "planned"].includes(normalized);
                    }
                    if (column.key === "to_do") {
                      return ["to_do"].includes(normalized);
                    }
                    if (column.key === "in_progress") {
                      return ["in_progress", "active"].includes(normalized);
                    }
                    if (column.key === "in_review") {
                      return ["in_review", "review"].includes(normalized);
                    }
                    return ["done", "resolved", "completed"].includes(normalized);
                  });

                  return (
                    <div className="kanban-column" key={column.key}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900">{column.label}</h4>
                        <span className="glass-chip">{columnItems.length}</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {columnItems.map((ticket) => (
                          <article className="task-card" key={ticket._id}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{ticket.title}</p>
                                <p className="muted-text mt-1 text-sm">{ticket.description || "No description provided."}</p>
                              </div>
                              <span className={`badge ${getPriorityFromTicket(ticket) === "High" ? "badge-danger" : getPriorityFromTicket(ticket) === "Medium" ? "badge-warning" : "badge-info"}`}>
                                {getPriorityFromTicket(ticket)}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3">
                              <span className="badge badge-primary">{normalizeStatus(ticket.status)}</span>
                              <span className="avatar-badge">{getInitials(ticket.assignedTo?.name || ticket.assignedTo?.email)}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                              <span>{ticket.assignedTo?.name || ticket.assignedTo?.email || "Unassigned"}</span>
                              <span>{formatDate(ticket.deadline)}</span>
                            </div>
                          </article>
                        ))}
                        {!columnItems.length ? <div className="surface-muted p-4 text-sm text-slate-500">No items here.</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Metadata panel</h3>
            <div className="mt-4 space-y-3">
              <InfoRow label="Project status" value={normalizeStatus(project.status)} />
              <InfoRow label="Client" value={project.clientEmail || "Not assigned"} />
              <InfoRow label="Assigned members" value={project.members?.length || 0} />
              <InfoRow label="Project tickets" value={tickets.length} />
            </div>
          </section>

          <section className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Team collaboration</h3>
              <button className="secondary-button" onClick={onSaveMembers} type="button">Save team</button>
            </div>
            <input className="input-field mt-4" onChange={(event) => onSearchMembers(event.target.value)} placeholder="Search active members" value={memberSearch} />
            <div className="mt-4 space-y-3">
              {searchedMembers.map((member) => (
                <button className="surface-card flex w-full items-center justify-between gap-3 p-4 text-left" key={member._id} onClick={() => onToggleMember(member._id)} type="button">
                  <div className="flex items-center gap-3">
                    <span className="avatar-badge">{getInitials(member.name)}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{member.name}</p>
                      <p className="muted-text text-sm">{member.email}</p>
                    </div>
                  </div>
                  <span className={`badge ${selectedMemberIds.includes(member._id) ? "badge-primary" : "badge-info"}`}>
                    {selectedMemberIds.includes(member._id) ? "Assigned" : "Add"}
                  </span>
                </button>
              ))}
            </div>
            {selectedMembers.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span className="glass-chip" key={member._id}>{member.name}</span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="surface-muted p-5">
            <h3 className="text-lg font-semibold text-slate-900">Create project issue</h3>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Title<input className="input-field" name="title" onChange={onTicketFormChange} value={adminTicketForm.title} /></label>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Description<textarea className="input-field min-h-24" name="description" onChange={onTicketFormChange} value={adminTicketForm.description} /></label>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Assignee<select className="input-field" name="assignedTo" onChange={onTicketFormChange} value={adminTicketForm.assignedTo}><option value="">Select member</option>{(project.members || []).map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Due date<input className="input-field" name="deadline" onChange={onTicketFormChange} type="date" value={adminTicketForm.deadline} /></label>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Status<select className="input-field" name="status" onChange={onTicketFormChange} value={adminTicketForm.status}><option value="open">Open</option><option value="to_do">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="done">Done</option></select></label>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Sprint<select className="input-field" name="sprintSelection" onChange={onTicketFormChange} value={adminTicketForm.sprintSelection}><option value="">Select sprint</option>{(project.planning || []).flatMap((phase, phaseIndex) => (phase.sprints || []).map((sprint, sprintIndex) => <option key={`${phaseIndex}-${sprintIndex}`} value={`${phaseIndex}:${sprintIndex}`}>{`${phase.name || `Phase ${phaseIndex + 1}`} / ${sprint.name || `Sprint ${sprintIndex + 1}`}`}</option>))}</select></label>
            <label className="mt-4 block text-sm font-semibold text-slate-900">Links<textarea className="input-field min-h-20" name="urlsText" onChange={onTicketFormChange} placeholder="One link per line" value={adminTicketForm.urlsText} /></label>
            <button className="primary-button mt-5 w-full" disabled={loading} onClick={onCreateTicket} type="button">{loading ? "Saving..." : "Create ticket"}</button>
          </section>
        </aside>
      </div>
    </section>
  );
}

function FormPage({ children, description, loading, onBack, onSubmit, submitLabel, title }) {
  return (
    <section className="surface-card mt-6 p-6">
      <button className="secondary-button" onClick={onBack} type="button">Back</button>
      <form className="surface-muted mt-5 grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <p className="eyebrow">{title}</p>
        <h2 className="section-title">{title}</h2>
        <p className="muted-text text-sm">{description}</p>
        {children}
        <button className="primary-button mt-2 w-full" disabled={loading} type="submit">{loading ? "Saving..." : submitLabel}</button>
      </form>
    </section>
  );
}

function MetricCard({ label, note, onClick, value }) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag className={`metric-card w-full text-left ${onClick ? "cursor-pointer hover:border-violet-200 hover:shadow-md" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <p className="muted-text text-sm font-semibold">{label}</p>
      <strong className="metric-value">{value}</strong>
      <p className="muted-text mt-2 text-sm">{note}</p>
    </Tag>
  );
}

function CompactStat({ label, onClick, value }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`surface-card w-full p-4 text-left ${onClick ? "cursor-pointer hover:border-violet-200 hover:shadow-md" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </Tag>
  );
}

function QuickTable({ columns, onClick, rows, title }) {
  function resolveValue(row, key) {
    return key.split(".").reduce((acc, part) => acc?.[part], row) || "-";
  }

  return (
    <section className={`surface-card p-6 ${onClick ? "cursor-pointer hover:border-violet-200 hover:shadow-md" : ""}`} onClick={onClick}>
      <p className="eyebrow">{title}</p>
      <h2 className="section-title mt-3 text-xl">{title}</h2>
      <div className="table-shell mt-5">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(([label]) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  {columns.map(([label, key]) => (
                    <td key={label}>{resolveValue(row, key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="surface-muted flex items-center justify-between gap-3 p-4">
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="muted-text text-sm">{value}</span>
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

function StatusBadge({ status }) {
  return <SurfaceStatusBadge status={status} />;
}

function EmptyState({ copy }) {
  return <EmptyStatePanel copy={copy} title="Nothing here yet" />;
}

export default AdminDashboard;
