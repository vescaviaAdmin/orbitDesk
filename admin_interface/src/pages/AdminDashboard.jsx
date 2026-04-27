import { useEffect, useMemo, useState } from "react";
import {
  addClient,
  addMember,
  addProject,
  getAdminSecret,
  getProject,
  listClients,
  listMembers,
  listProjects,
  listRequests,
  updateProjectMembers,
  verifyAdminSecret,
} from "../api/admin";

const emptyForms = {
  client: { name: "", email: "", company: "", phone: "", agreement: null },
  member: { name: "", email: "" },
  project: { name: "", clientEmail: "", status: "planned", description: "" },
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

function AdminDashboard() {
  const [path, setPath] = useState(window.location.pathname);
  const [adminSecret, setAdminSecret] = useState(getAdminSecret());
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("orbitdesk_admin_secret")));
  const [forms, setForms] = useState(emptyForms);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTickets, setProjectTickets] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [memberDirectorySearch, setMemberDirectorySearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const projectIdFromPath = path.match(/^\/projects\/([^/]+)$/)?.[1] || "";
  const isDashboardPath = path === "/" || path === "/admin";
  const isClientsPath = path === "/clients";
  const isMembersPath = path === "/members";
  const isProjectsPath = path === "/projects";
  const isRequestsPath = path === "/requests";

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

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  async function loadDashboard() {
    try {
      const [clientData, memberData, projectData, requestData] = await Promise.all([
        listClients(),
        listMembers(),
        listProjects(),
        listRequests(),
      ]);
      setClients(clientData.clients || []);
      setMembers(memberData.members || []);
      setProjects(projectData.projects || []);
      setRequests(requestData.requests || []);
    } catch (requestError) {
      if (requestError.message === "Invalid admin secret") {
        localStorage.removeItem("orbitdesk_admin_secret");
        setIsLoggedIn(false);
        setAdminSecret("");
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
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    loadDashboard();
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && projectIdFromPath) {
      loadProject(projectIdFromPath);
      return;
    }

    setSelectedProject(null);
    setProjectTickets([]);
    setSelectedMemberIds([]);
  }, [isLoggedIn, projectIdFromPath]);

  async function loginAdmin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await verifyAdminSecret(adminSecret);
      localStorage.setItem("orbitdesk_admin_secret", adminSecret);
      setIsLoggedIn(true);
      routeTo("/");
    } catch (requestError) {
      localStorage.removeItem("orbitdesk_admin_secret");
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

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
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function logoutAdmin() {
    localStorage.removeItem("orbitdesk_admin_secret");
    setIsLoggedIn(false);
    setAdminSecret("");
    setStatus("");
    setError("");
    routeTo("/");
  }

  if (!isLoggedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5 py-8 text-[#151b20]">
        <form className="w-full max-w-md rounded-lg border border-[#d8dde5] bg-white p-6 shadow-sm" onSubmit={loginAdmin}>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b4f1d]">OrbitDesk Admin</p>
          <h1 className="mt-3 text-3xl font-bold">Admin login</h1>
          <label className="mt-6 block text-sm font-semibold" htmlFor="adminSecret">
            Admin secret
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#c7ced8] px-3 outline-none focus:border-[#6b4f1d] focus:ring-2 focus:ring-[#6b4f1d]/20"
              id="adminSecret"
              onChange={(event) => setAdminSecret(event.target.value)}
              required
              type="password"
              value={adminSecret}
            />
          </label>
          <button className="mt-5 h-12 w-full rounded-md bg-[#6b4f1d] font-semibold text-white" type="submit">
            {loading ? "Checking..." : "Login"}
          </button>
          {error ? <p className="mt-4 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8 text-[#151b20]">
      <section className="mx-auto max-w-7xl">
        <AdminHeader
          activePath={path}
          counts={{ clients: clients.length, members: members.length, projects: projects.length, requests: requests.length }}
          onLogout={logoutAdmin}
        />
        {status ? <p className="mt-5 rounded-md bg-[#e8f5eb] px-3 py-2 text-sm text-[#1b6b3a]">{status}</p> : null}
        {error ? <p className="mt-5 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

        {path === "/clients/onboard" ? (
          <ClientOnboardingPage
            form={forms.client}
            loading={loading}
            onBack={() => routeTo("/clients")}
            onChange={(event) => updateForm("client", event)}
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

        {path === "/projects/new" ? (
          <ProjectCreatePage
            form={forms.project}
            loading={loading}
            onBack={() => routeTo("/projects")}
            onChange={(event) => updateForm("project", event)}
            onSubmit={() => handleCreate("project", addProject, "/projects")}
          />
        ) : null}

        {projectIdFromPath ? (
          <ProjectDetailPage
            loading={loading}
            memberSearch={memberSearch}
            onBack={() => routeTo("/projects")}
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
            clientSearch={clientSearch}
            invitedClients={invitedClients.length}
            invitedMembers={invitedMembers.length}
            members={filteredMembers}
            memberSearch={memberDirectorySearch}
            onClientSearch={setClientSearch}
            onMemberSearch={setMemberDirectorySearch}
            onProjectSearch={setProjectSearch}
            projectSearch={projectSearch}
            projects={filteredProjects}
            requests={filteredRequests}
            totalClients={clients.length}
            totalMembers={members.length}
            totalProjects={projects.length}
            totalRequests={requests.length}
          />
        ) : null}

        {isClientsPath ? (
          <ResourceDirectory
            actionLabel="Onboard client"
            countLabel={`${clients.length} total`}
            emptyMessage="No clients found."
            items={filteredClients}
            onAction={() => routeTo("/clients/onboard")}
            onSearch={setClientSearch}
            searchPlaceholder="Search by name, email, company, or phone"
            searchValue={clientSearch}
            title="Clients"
          >
            {(client) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={client._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-[#5c6673]">{client.email}</p>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-[#5c6673] sm:grid-cols-2">
                  <MetaItem label="Company" value={client.company || "-"} />
                  <MetaItem label="Phone" value={client.phone || "-"} />
                  <MetaItem label="Onboarded" value={formatDate(client.onboardedAt)} />
                  <MetaItem label="Password set" value={formatDate(client.passwordSetAt)} />
                </dl>
                {client.agreementDocument?.url ? (
                  <a className="mt-4 inline-flex rounded-md bg-[#2f6f5e] px-3 py-2 text-sm font-semibold text-white" href={client.agreementDocument.url} rel="noreferrer" target="_blank">
                    View agreement
                  </a>
                ) : null}
              </article>
            )}
          </ResourceDirectory>
        ) : null}

        {isMembersPath ? (
          <ResourceDirectory
            actionLabel="Add member"
            countLabel={`${members.length} total`}
            emptyMessage="No members found."
            items={filteredMembers}
            onAction={() => routeTo("/members/new")}
            onSearch={setMemberDirectorySearch}
            searchPlaceholder="Search by name, email, or status"
            searchValue={memberDirectorySearch}
            title="Members"
          >
            {(member) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={member._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-[#5c6673]">{member.email}</p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-[#5c6673] sm:grid-cols-2">
                  <MetaItem label="Invited" value={formatDate(member.invitedAt)} />
                  <MetaItem label="Password set" value={formatDate(member.passwordSetAt)} />
                </dl>
              </article>
            )}
          </ResourceDirectory>
        ) : null}

        {isProjectsPath ? (
          <ResourceDirectory
            actionLabel="Add project"
            countLabel={`${projects.length} total`}
            emptyMessage="No projects found."
            items={filteredProjects}
            onAction={() => routeTo("/projects/new")}
            onSearch={setProjectSearch}
            searchPlaceholder="Search by project, client email, status, or description"
            searchValue={projectSearch}
            title="Projects"
          >
            {(project) => (
              <button className="rounded-lg border border-[#edf0f4] p-4 text-left transition hover:border-[#6b4f1d]" key={project._id} onClick={() => routeTo(`/projects/${project._id}`)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="mt-1 text-sm text-[#5c6673]">{project.clientEmail || "No client assigned"}</p>
                    <p className="mt-1 text-sm text-[#5c6673]">{project.description || "No project description"}</p>
                    <p className="mt-3 text-xs font-semibold text-[#6b4f1d]">{project.members?.length || 0} members assigned</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </button>
            )}
          </ResourceDirectory>
        ) : null}

        {isRequestsPath ? (
          <ResourceDirectory
            countLabel={`${requests.length} total`}
            emptyMessage="No requests found."
            items={filteredRequests}
            onSearch={setRequestSearch}
            searchPlaceholder="Search by title, project, member, or status"
            searchValue={requestSearch}
            title="Requests"
          >
            {(requestItem) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={requestItem._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{requestItem.title}</h3>
                    <p className="mt-1 text-sm text-[#5c6673]">{requestItem.project?.name || "Project"}</p>
                  </div>
                  <StatusBadge status={requestItem.status} />
                </div>
                <p className="mt-3 text-sm text-[#5c6673]">{requestItem.description || "No description"}</p>
                <dl className="mt-4 grid gap-3 text-sm text-[#5c6673] sm:grid-cols-2">
                  <MetaItem label="Raised by" value={requestItem.createdBy?.name || "-"} />
                  <MetaItem label="Email" value={requestItem.createdBy?.email || "-"} />
                  <MetaItem label="Client email" value={requestItem.project?.clientEmail || "-"} />
                  <MetaItem label="Raised on" value={formatDate(requestItem.createdAt)} />
                </dl>
              </article>
            )}
          </ResourceDirectory>
        ) : null}
      </section>
    </main>
  );
}

function AdminHeader({ activePath, counts, onLogout }) {
  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: `Clients (${counts.clients})`, path: "/clients" },
    { label: `Projects (${counts.projects})`, path: "/projects" },
    { label: `Members (${counts.members})`, path: "/members" },
    { label: `Requests (${counts.requests})`, path: "/requests" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b4f1d]">OrbitDesk Admin</p>
          <h1 className="mt-3 text-4xl font-bold">Operations dashboard</h1>
        </div>
        <div className="grid w-full gap-2 sm:w-56">
          <button className="h-11 rounded-md bg-[#243c5a] px-4 text-sm font-semibold text-white" onClick={() => routeTo("/projects/new")} type="button">
            Add project
          </button>
          <button className="h-11 rounded-md bg-[#2f6f5e] px-4 text-sm font-semibold text-white" onClick={() => routeTo("/clients/onboard")} type="button">
            Onboard client
          </button>
          <button className="h-11 rounded-md bg-[#6b4f1d] px-4 text-sm font-semibold text-white" onClick={() => routeTo("/members/new")} type="button">
            Add member
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[#d8dde5] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive =
              activePath === item.path ||
              (item.path === "/projects" && activePath.startsWith("/projects/")) ||
              (item.path === "/clients" && activePath.startsWith("/clients")) ||
              (item.path === "/members" && activePath.startsWith("/members")) ||
              (item.path === "/requests" && activePath.startsWith("/requests"));

            return (
              <button
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-[#6b4f1d] text-white" : "border border-[#c7ced8] bg-white text-[#414c5a]"
                }`}
                key={item.path}
                onClick={() => routeTo(item.path)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <button className="rounded-md border border-[#c7ced8] px-4 py-2 text-sm font-semibold text-[#414c5a]" onClick={onLogout} type="button">
          Logout
        </button>
      </div>
    </div>
  );
}

function DashboardHome({
  activeClients,
  activeMembers,
  activeProjectsCount,
  clients,
  clientSearch,
  invitedClients,
  invitedMembers,
  members,
  memberSearch,
  onClientSearch,
  onMemberSearch,
  onProjectSearch,
  projectSearch,
  projects,
  requests,
  totalClients,
  totalMembers,
  totalProjects,
  totalRequests,
}) {
  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Clients" sublabel={`${activeClients} active / ${invitedClients} invited`} value={totalClients} />
        <SummaryCard label="Projects" sublabel={`${activeProjectsCount} active`} value={totalProjects} />
        <SummaryCard label="Members" sublabel={`${activeMembers} active / ${invitedMembers} invited`} value={totalMembers} />
        <SummaryCard label="Requests" sublabel="Member-raised admin review queue" value={totalRequests} />
      </div>

      <div className="mt-6 grid gap-6">
        <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Clients</h2>
              <p className="mt-1 text-sm text-[#5c6673]">Search and review every onboarded client.</p>
            </div>
            <div className="flex flex-col gap-2 sm:w-[24rem] sm:flex-row">
              <input className="h-10 flex-1 rounded-md border border-[#c7ced8] px-3 text-sm outline-none focus:border-[#6b4f1d]" onChange={(event) => onClientSearch(event.target.value)} placeholder="Search clients" value={clientSearch} />
              <button className="rounded-md border border-[#c7ced8] px-3 py-2 text-sm font-semibold" onClick={() => routeTo("/clients")} type="button">
                See all
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.slice(0, 6).map((client) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={client._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-[#5c6673]">{client.email}</p>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <p className="mt-3 text-sm text-[#5c6673]">{client.company || "No company provided"}</p>
                {client.agreementDocument?.url ? (
                  <a className="mt-3 inline-block text-sm font-semibold text-[#2f6f5e]" href={client.agreementDocument.url} rel="noreferrer" target="_blank">
                    View agreement
                  </a>
                ) : null}
              </article>
            ))}
            {!clients.length ? <p className="text-sm text-[#5c6673]">No clients found.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-[#5c6673]">Open a project to manage member assignments and review tickets.</p>
            </div>
            <div className="flex flex-col gap-2 sm:w-[24rem] sm:flex-row">
              <input className="h-10 flex-1 rounded-md border border-[#c7ced8] px-3 text-sm outline-none focus:border-[#6b4f1d]" onChange={(event) => onProjectSearch(event.target.value)} placeholder="Search projects" value={projectSearch} />
              <button className="rounded-md border border-[#c7ced8] px-3 py-2 text-sm font-semibold" onClick={() => routeTo("/projects")} type="button">
                See all
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {projects.slice(0, 6).map((project) => (
              <button className="rounded-lg border border-[#edf0f4] p-4 text-left transition hover:border-[#6b4f1d]" key={project._id} onClick={() => routeTo(`/projects/${project._id}`)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-[#5c6673]">{project.clientEmail || "No client assigned"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6b4f1d]">{project.members?.length || 0} members assigned</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              </button>
            ))}
            {!projects.length ? <p className="text-sm text-[#5c6673]">No projects yet.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Members</h2>
              <p className="mt-1 text-sm text-[#5c6673]">Track invited and active team members in one place.</p>
            </div>
            <div className="flex flex-col gap-2 sm:w-[24rem] sm:flex-row">
              <input className="h-10 flex-1 rounded-md border border-[#c7ced8] px-3 text-sm outline-none focus:border-[#6b4f1d]" onChange={(event) => onMemberSearch(event.target.value)} placeholder="Search members" value={memberSearch} />
              <button className="rounded-md border border-[#c7ced8] px-3 py-2 text-sm font-semibold" onClick={() => routeTo("/members")} type="button">
                See all
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {members.slice(0, 6).map((member) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={member._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-[#5c6673]">{member.email}</p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
                <p className="mt-3 text-sm text-[#5c6673]">Invited: {formatDate(member.invitedAt)}</p>
              </article>
            ))}
            {!members.length ? <p className="text-sm text-[#5c6673]">No members found.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Requests</h2>
              <p className="mt-1 text-sm text-[#5c6673]">Requests raised by members for admin review.</p>
            </div>
            <button className="rounded-md border border-[#c7ced8] px-3 py-2 text-sm font-semibold" onClick={() => routeTo("/requests")} type="button">
              View requests
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {requests.slice(0, 6).map((requestItem) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={requestItem._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{requestItem.title}</h3>
                    <p className="text-sm text-[#5c6673]">{requestItem.project?.name || "Project"}</p>
                  </div>
                  <StatusBadge status={requestItem.status} />
                </div>
                <p className="mt-3 text-sm text-[#5c6673]">{requestItem.createdBy?.name || "Member"}</p>
              </article>
            ))}
            {!requests.length ? <p className="text-sm text-[#5c6673]">No requests found.</p> : null}
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({ label, sublabel, value }) {
  return (
    <article className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#5c6673]">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
      {sublabel ? <p className="mt-2 text-sm text-[#5c6673]">{sublabel}</p> : null}
    </article>
  );
}

function ResourceDirectory({
  actionLabel,
  children,
  countLabel,
  emptyMessage,
  items,
  onAction,
  onSearch,
  searchPlaceholder,
  searchValue,
  title,
}) {
  return (
    <section className="mt-8 rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[#5c6673]">{countLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="h-11 w-full rounded-md border border-[#c7ced8] px-3 text-sm outline-none focus:border-[#6b4f1d] sm:w-80"
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            value={searchValue}
          />
          {actionLabel && onAction ? (
            <button className="h-11 rounded-md bg-[#6b4f1d] px-4 text-sm font-semibold text-white" onClick={onAction} type="button">
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {items.map((item) => children(item))}
        {!items.length ? <p className="text-sm text-[#5c6673]">{emptyMessage}</p> : null}
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = status || "unknown";
  const tone =
    normalizedStatus === "active"
      ? "bg-[#e8f5eb] text-[#1b6b3a]"
      : normalizedStatus === "invited" || normalizedStatus === "planned"
        ? "bg-[#fff4da] text-[#8a6116]"
        : normalizedStatus === "completed"
          ? "bg-[#eef1f5] text-[#414c5a]"
          : "bg-[#eef1f5] text-[#414c5a]";

  return <span className={`rounded-md px-3 py-1 text-sm font-semibold capitalize ${tone}`}>{normalizedStatus.replaceAll("_", " ")}</span>;
}

function MetaItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b8490]">{label}</dt>
      <dd className="mt-1 text-sm text-[#5c6673]">{value}</dd>
    </div>
  );
}

function ClientOnboardingPage({ form, loading, onBack, onChange, onSubmit }) {
  return (
    <FormPage title="Onboard client" onBack={onBack} onSubmit={onSubmit}>
      <TextField label="Name" name="name" onChange={onChange} required value={form.name} />
      <TextField label="Email" name="email" onChange={onChange} required type="email" value={form.email} />
      <TextField label="Company" name="company" onChange={onChange} value={form.company} />
      <TextField label="Phone" name="phone" onChange={onChange} value={form.phone} />
      <label className="block text-sm font-semibold" htmlFor="agreement">
        Signed agreement document
        <input
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="mt-2 block w-full rounded-md border border-[#c7ced8] px-3 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#eef1f5] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#414c5a] focus:border-[#6b4f1d] focus:outline-none focus:ring-2 focus:ring-[#6b4f1d]/20"
          id="agreement"
          name="agreement"
          onChange={onChange}
          required
          type="file"
        />
      </label>
      <SubmitButton loading={loading} label="Create client and send mail" />
    </FormPage>
  );
}

function MemberCreatePage({ form, loading, onBack, onChange, onSubmit }) {
  return (
    <FormPage title="Add member" onBack={onBack} onSubmit={onSubmit}>
      <TextField label="Name" name="name" onChange={onChange} required value={form.name} />
      <TextField label="Email" name="email" onChange={onChange} required type="email" value={form.email} />
      <SubmitButton loading={loading} label="Add member and send mail" />
    </FormPage>
  );
}

function ProjectCreatePage({ form, loading, onBack, onChange, onSubmit }) {
  return (
    <FormPage title="Add project" onBack={onBack} onSubmit={onSubmit}>
      <TextField label="Project name" name="name" onChange={onChange} required value={form.name} />
      <TextField label="Client email" name="clientEmail" onChange={onChange} type="email" value={form.clientEmail} />
      <label className="block text-sm font-semibold" htmlFor="status">
        Status
        <select className="mt-2 h-12 w-full rounded-md border border-[#c7ced8] px-3 outline-none focus:border-[#6b4f1d] focus:ring-2 focus:ring-[#6b4f1d]/20" id="status" name="status" onChange={onChange} value={form.status}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </label>
      <label className="block text-sm font-semibold" htmlFor="description">
        Description
        <textarea className="mt-2 min-h-24 w-full rounded-md border border-[#c7ced8] px-3 py-2 outline-none focus:border-[#6b4f1d] focus:ring-2 focus:ring-[#6b4f1d]/20" id="description" name="description" onChange={onChange} value={form.description} />
      </label>
      <SubmitButton loading={loading} label="Add project" />
    </FormPage>
  );
}

function ProjectDetailPage({
  loading,
  memberSearch,
  onBack,
  onSaveMembers,
  onSearchMembers,
  onToggleMember,
  project,
  searchedMembers,
  selectedMemberIds,
  selectedMembers,
  tickets,
}) {
  if (!project) {
    return <p className="mt-8 rounded-lg border border-[#d8dde5] bg-white p-5 text-sm text-[#5c6673]">Loading project...</p>;
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
        <button className="rounded-md border border-[#c7ced8] px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
          Back
        </button>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="mt-1 text-sm text-[#5c6673]">{project.description || "No project description"}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <dl className="mt-6 grid gap-3 text-sm text-[#5c6673] sm:grid-cols-2">
          <MetaItem label="Client email" value={project.clientEmail || "-"} />
          <MetaItem label="Assigned members" value={String(selectedMembers.length)} />
          <MetaItem label="Tickets" value={String(tickets.length)} />
          <MetaItem label="Created" value={formatDate(project.createdAt)} />
        </dl>

        <div className="mt-6">
          <h3 className="font-semibold">Assigned members</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <button className="rounded-md bg-[#eef1f5] px-3 py-1 text-sm font-semibold text-[#414c5a]" key={member._id} onClick={() => onToggleMember(member._id)} type="button">
                {member.name} x
              </button>
            ))}
            {!selectedMembers.length ? <span className="text-sm text-[#5c6673]">No members selected.</span> : null}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold" htmlFor="memberSearch">
            Search members
            <input className="mt-2 h-11 w-full rounded-md border border-[#c7ced8] px-3 outline-none focus:border-[#6b4f1d] focus:ring-2 focus:ring-[#6b4f1d]/20" id="memberSearch" onChange={(event) => onSearchMembers(event.target.value)} placeholder="Name or email" value={memberSearch} />
          </label>
          <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-[#edf0f4]">
            {searchedMembers.map((member) => (
              <button className="flex w-full items-center justify-between gap-3 border-b border-[#edf0f4] px-3 py-3 text-left last:border-b-0" key={member._id} onClick={() => onToggleMember(member._id)} type="button">
                <span>
                  <strong className="block">{member.name}</strong>
                  <span className="text-sm text-[#5c6673]">{member.email}</span>
                </span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${selectedMemberIds.includes(member._id) ? "bg-[#e8f5eb] text-[#1b6b3a]" : "bg-[#eef1f5] text-[#414c5a]"}`}>
                  {selectedMemberIds.includes(member._id) ? "Selected" : "Add"}
                </span>
              </button>
            ))}
            {!searchedMembers.length ? <p className="p-4 text-sm text-[#5c6673]">No active members found.</p> : null}
          </div>
        </div>

        <button className="mt-5 h-11 rounded-md bg-[#6b4f1d] px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={onSaveMembers} type="button">
          {loading ? "Saving..." : "Save members"}
        </button>
      </section>

      <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Tickets</h3>
          <p className="text-sm text-[#5c6673]">{tickets.length} total</p>
        </div>
        <div className="mt-4 divide-y divide-[#edf0f4]">
          {tickets.map((ticket) => (
            <article className="py-4" key={ticket._id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{ticket.title}</h4>
                  <p className="text-sm text-[#5c6673]">Assigned to {ticket.assignedTo?.name || "member"}</p>
                  <p className="mt-1 text-sm text-[#5c6673]">Created by {ticket.createdBy?.name || "member"}</p>
                  <p className="mt-1 text-sm text-[#5c6673]">Deadline {formatDate(ticket.deadline)}</p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
            </article>
          ))}
          {!tickets.length ? <p className="py-8 text-sm text-[#5c6673]">No tickets raised yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function FormPage({ children, onBack, onSubmit, title }) {
  return (
    <form
      className="mt-8 max-w-2xl rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <button className="rounded-md border border-[#c7ced8] px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
        Back
      </button>
      <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </form>
  );
}

function TextField({ label, name, onChange, required = false, type = "text", value }) {
  return (
    <label className="block text-sm font-semibold" htmlFor={name}>
      {label}
      <input className="mt-2 h-12 w-full rounded-md border border-[#c7ced8] px-3 outline-none focus:border-[#6b4f1d] focus:ring-2 focus:ring-[#6b4f1d]/20" id={name} name={name} onChange={onChange} required={required} type={type} value={value} />
    </label>
  );
}

function SubmitButton({ label, loading }) {
  return (
    <button className="h-12 w-full rounded-md bg-[#6b4f1d] font-semibold text-white transition hover:bg-[#563f16] disabled:cursor-not-allowed disabled:opacity-60" disabled={loading} type="submit">
      {loading ? "Saving..." : label}
    </button>
  );
}

export default AdminDashboard;
