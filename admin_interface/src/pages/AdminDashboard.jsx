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

function AdminDashboard() {
  const [path, setPath] = useState(window.location.pathname);
  const [adminSecret, setAdminSecret] = useState(getAdminSecret());
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("orbitdesk_admin_secret")));
  const [forms, setForms] = useState(emptyForms);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTickets, setProjectTickets] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const projectIdFromPath = path.match(/^\/projects\/([^/]+)$/)?.[1] || "";
  const activeMembers = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  const searchedMembers = useMemo(() => {
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

  useEffect(() => {
    function handleRouteChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  async function loadDashboard() {
    try {
      const [clientData, memberData, projectData] = await Promise.all([listClients(), listMembers(), listProjects()]);
      setClients(clientData.clients || []);
      setMembers(memberData.members || []);
      setProjects(projectData.projects || []);
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
    }
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
        <AdminHeader />
        {status ? <p className="mt-5 rounded-md bg-[#e8f5eb] px-3 py-2 text-sm text-[#1b6b3a]">{status}</p> : null}
        {error ? <p className="mt-5 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

        {path === "/clients/onboard" ? (
          <ClientOnboardingPage form={forms.client} loading={loading} onBack={() => routeTo("/")} onChange={(event) => updateForm("client", event)} onSubmit={() => handleCreate("client", addClient, "/")} />
        ) : null}

        {path === "/members/new" ? (
          <MemberCreatePage form={forms.member} loading={loading} onBack={() => routeTo("/")} onChange={(event) => updateForm("member", event)} onSubmit={() => handleCreate("member", addMember, "/")} />
        ) : null}

        {path === "/projects/new" ? (
          <ProjectCreatePage form={forms.project} loading={loading} onBack={() => routeTo("/")} onChange={(event) => updateForm("project", event)} onSubmit={() => handleCreate("project", addProject, "/")} />
        ) : null}

        {projectIdFromPath ? (
          <ProjectDetailPage
            activeMembers={activeMembers}
            loading={loading}
            memberSearch={memberSearch}
            onBack={() => routeTo("/")}
            onSaveMembers={saveProjectMembers}
            onSearchMembers={setMemberSearch}
            onToggleMember={toggleProjectMember}
            project={selectedProject}
            searchedMembers={searchedMembers}
            selectedMemberIds={selectedMemberIds}
            selectedMembers={selectedMembers}
            tickets={projectTickets}
          />
        ) : null}

        {path === "/" || path === "/admin" ? (
          <DashboardHome clients={filteredClients} clientSearch={clientSearch} members={members} onClientSearch={setClientSearch} projects={projects} />
        ) : null}
      </section>
    </main>
  );
}

function AdminHeader() {
  return (
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
  );
}

function DashboardHome({ clients, clientSearch, members, onClientSearch, projects }) {
  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Clients" value={clients.length} />
        <SummaryCard label="Projects" value={projects.length} />
        <SummaryCard label="Members" value={members.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Clients</h2>
            <input className="h-10 rounded-md border border-[#c7ced8] px-3 text-sm outline-none focus:border-[#6b4f1d] sm:w-64" onChange={(event) => onClientSearch(event.target.value)} placeholder="Search clients" value={clientSearch} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {clients.slice(0, 8).map((client) => (
              <article className="rounded-lg border border-[#edf0f4] p-4" key={client._id}>
                <h3 className="font-semibold">{client.name}</h3>
                <p className="text-sm text-[#5c6673]">{client.email}</p>
                {client.agreementDocument?.url ? (
                  <a className="mt-2 inline-block text-sm font-semibold text-[#2f6f5e]" href={client.agreementDocument.url} rel="noreferrer" target="_blank">
                    View agreement
                  </a>
                ) : null}
              </article>
            ))}
            {!clients.length ? <p className="text-sm text-[#5c6673]">No clients found.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Projects</h2>
          <div className="mt-5 grid gap-3">
            {projects.map((project) => (
              <button className="rounded-lg border border-[#edf0f4] p-4 text-left transition hover:border-[#6b4f1d]" key={project._id} onClick={() => routeTo(`/projects/${project._id}`)} type="button">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-[#5c6673]">{project.clientEmail || "No client assigned"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#6b4f1d]">{project.members?.length || 0} members assigned</p>
                  </div>
                  <span className="rounded-md bg-[#eef1f5] px-3 py-1 text-sm font-semibold capitalize text-[#414c5a]">{project.status}</span>
                </div>
              </button>
            ))}
            {!projects.length ? <p className="text-sm text-[#5c6673]">No projects yet.</p> : null}
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-[#d8dde5] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#5c6673]">{label}</p>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </article>
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
        <h2 className="mt-5 text-2xl font-semibold">{project.name}</h2>
        <p className="mt-1 text-sm text-[#5c6673]">{project.description || "No project description"}</p>

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
        <h3 className="text-xl font-semibold">Tickets</h3>
        <div className="mt-4 divide-y divide-[#edf0f4]">
          {tickets.map((ticket) => (
            <article className="py-4" key={ticket._id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{ticket.title}</h4>
                  <p className="text-sm text-[#5c6673]">Assigned to {ticket.assignedTo?.name || "member"}</p>
                </div>
                <span className="rounded-md bg-[#eef1f5] px-2 py-1 text-xs font-semibold capitalize text-[#414c5a]">{ticket.status}</span>
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
