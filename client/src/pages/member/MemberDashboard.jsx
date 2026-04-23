import { useEffect, useMemo, useState } from "react";
import { getMemberProject, getMemberTicket, listMemberProjects, listMemberTickets, raiseTicket } from "../../api/member";

const emptyTicket = {
  title: "",
  description: "",
  assignedTo: "",
  deadline: "",
  urlsText: "",
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

function MemberDashboard() {
  const session = JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
  const [path, setPath] = useState(window.location.pathname);
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [projectClient, setProjectClient] = useState(null);
  const [projectTickets, setProjectTickets] = useState([]);
  const [ticketForm, setTicketForm] = useState(emptyTicket);
  const [memberSearch, setMemberSearch] = useState("");
  const [ticketFilterMemberId, setTicketFilterMemberId] = useState("all");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const projectIdFromPath = path.match(/^\/member\/projects\/([^/]+)$/)?.[1] || "";
  const ticketIdFromPath = path.match(/^\/member\/tickets\/([^/]+)$/)?.[1] || "";
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
  const filteredProjectTickets = useMemo(() => {
    if (ticketFilterMemberId === "all") {
      return projectTickets;
    }

    return projectTickets.filter((ticket) => ticket.assignedTo?._id === ticketFilterMemberId);
  }, [projectTickets, ticketFilterMemberId]);

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
      setProjectTickets(data.tickets || []);
      setTicketFilterMemberId("all");
      setTicketForm({
        ...emptyTicket,
        assignedTo: data.project.members?.[0]?._id || "",
      });
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

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    if (projectIdFromPath) {
      loadProject(projectIdFromPath);
      return;
    }

    if (ticketIdFromPath) {
      loadTicket(ticketIdFromPath);
      return;
    }

    setSelectedProject(null);
    setSelectedTicket(null);
    setProjectClient(null);
    setProjectTickets([]);
    setTicketForm(emptyTicket);
  }, [projectIdFromPath, ticketIdFromPath]);

  function updateTicket(event) {
    const { name, value } = event.target;
    setTicketForm((current) => ({
      ...current,
      [name]: value,
    }));
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
        urls,
      });

      setProjectTickets((current) => [data.ticket, ...current]);
      setTickets((current) => [data.ticket, ...current]);
      setTicketForm({
        ...emptyTicket,
        assignedTo: selectedProject.members?.[0]?._id || "",
      });
      setMemberSearch("");
      setTicketFilterMemberId("all");
      setStatus(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const visibleProjects = showAllProjects ? projects : projects.slice(0, 6);
  const visibleTickets = showAllTickets ? tickets : tickets.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-5 py-8 text-[#17201c]">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4b5d8c]">Member Interface</p>
            <h1 className="mt-3 text-4xl font-bold">Hello, {session.user?.name || "member"}</h1>
          </div>
          <button className="h-11 rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-semibold" onClick={loadHomeData} type="button">
            Refresh
          </button>
        </div>

        {error ? <p className="mt-5 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}
        {status ? <p className="mt-5 rounded-md bg-[#e8f5eb] px-3 py-2 text-sm text-[#1b6b3a]">{status}</p> : null}

        {projectIdFromPath ? (
          <ProjectDetail
            assignedMember={assignedMember}
            loading={loading}
            memberSearch={memberSearch}
            onBack={() => routeTo("/member/dashboard")}
            onMemberSearch={setMemberSearch}
            onSelectAssignee={(memberId) => setTicketForm((current) => ({ ...current, assignedTo: memberId }))}
            onSubmitTicket={handleTicketSubmit}
            onTicketChange={updateTicket}
            project={selectedProject}
            projectClient={projectClient}
            searchedMembers={searchedProjectMembers}
            ticketFilterMemberId={ticketFilterMemberId}
            ticketForm={ticketForm}
            tickets={filteredProjectTickets}
            onTicketFilterChange={setTicketFilterMemberId}
          />
        ) : null}

        {ticketIdFromPath ? <TicketDetail ticket={selectedTicket} onBack={() => routeTo("/member/dashboard")} /> : null}

        {!projectIdFromPath && !ticketIdFromPath ? (
          <DashboardHome
            loading={loading}
            onToggleProjects={() => setShowAllProjects((current) => !current)}
            onToggleTickets={() => setShowAllTickets((current) => !current)}
            projects={visibleProjects}
            projectsTotal={projects.length}
            showAllProjects={showAllProjects}
            showAllTickets={showAllTickets}
            tickets={visibleTickets}
            ticketsTotal={tickets.length}
          />
        ) : null}
      </section>
    </main>
  );
}

function DashboardHome({ loading, onToggleProjects, onToggleTickets, projects, projectsTotal, showAllProjects, showAllTickets, tickets, ticketsTotal }) {
  return (
    <>
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Projects</h2>
          {projectsTotal > 6 ? (
            <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onToggleProjects} type="button">
              {showAllProjects ? "Show less" : "See all"}
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {projects.map((project) => (
            <article className="rounded-lg border border-[#d3d8e3] bg-white p-5 text-left shadow-sm" key={project._id}>
              <span className="rounded-md bg-[#eef1f7] px-2 py-1 text-xs font-semibold capitalize text-[#4b5d8c]">{project.status}</span>
              <h3 className="mt-4 text-lg font-semibold">{project.name}</h3>
              <p className="mt-2 text-sm text-[#596274]">{project.clientEmail || "No client assigned"}</p>
              <div className="mt-5 flex gap-2">
                <button className="h-10 flex-1 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold" onClick={() => routeTo(`/member/projects/${project._id}`)} type="button">
                  View project
                </button>
                <button className="h-10 flex-1 rounded-md bg-[#4b5d8c] px-3 text-sm font-semibold text-white" onClick={() => routeTo(`/member/projects/${project._id}`)} type="button">
                  Raise ticket
                </button>
              </div>
            </article>
          ))}
          {!projects.length ? (
            <p className="rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">
              {loading ? "Loading projects..." : "No assigned projects yet."}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Your Tickets</h2>
          {ticketsTotal > 6 ? (
            <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onToggleTickets} type="button">
              {showAllTickets ? "Show less" : "See all"}
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <article className="rounded-lg border border-[#d3d8e3] bg-white p-5 shadow-sm" key={ticket._id}>
              <p className="text-sm font-semibold text-[#4b5d8c]">{ticket.project?.name || "Project"}</p>
              <h3 className="mt-2 text-lg font-semibold">{ticket.title}</h3>
              <p className="mt-2 text-sm text-[#596274]">Deadline: {formatDate(ticket.deadline)}</p>
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
    </>
  );
}

function ProjectDetail({
  assignedMember,
  loading,
  memberSearch,
  onBack,
  onMemberSearch,
  onSelectAssignee,
  onSubmitTicket,
  onTicketChange,
  project,
  projectClient,
  searchedMembers,
  ticketFilterMemberId,
  ticketForm,
  tickets,
  onTicketFilterChange,
}) {
  if (!project) {
    return <p className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">Loading project...</p>;
  }

  return (
    <section className="mt-8">
      <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
        Back to dashboard
      </button>
      <div className="mt-5">
        <span className="rounded-md bg-[#eef1f7] px-2 py-1 text-xs font-semibold capitalize text-[#4b5d8c]">{project.status}</span>
        <h2 className="mt-3 text-3xl font-bold">{project.name}</h2>
        <p className="mt-2 text-sm text-[#596274]">{project.description || "No project description"}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="rounded-lg border border-[#d3d8e3] bg-white p-5 shadow-sm" onSubmit={onSubmitTicket}>
          <h3 className="text-xl font-semibold">Raise ticket</h3>

          <label className="mt-5 block text-sm font-semibold" htmlFor="title">
            Title
            <input className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="title" name="title" onChange={onTicketChange} required value={ticketForm.title} />
          </label>

          <label className="mt-4 block text-sm font-semibold" htmlFor="deadline">
            Deadline
            <input className="mt-2 h-12 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="deadline" name="deadline" onChange={onTicketChange} required type="date" value={ticketForm.deadline} />
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

        <section className="space-y-6">
          <section className="rounded-lg border border-[#d3d8e3] bg-white p-5 shadow-sm">
            <h3 className="text-xl font-semibold">Documents</h3>
            <div className="mt-4">
              {projectClient?.agreementDocument?.url ? (
                <article className="rounded-lg border border-[#edf0f4] p-4">
                  <p className="text-sm font-semibold text-[#4b5d8c]">Agreement document</p>
                  <p className="mt-1 text-sm text-[#596274]">{projectClient.agreementDocument.originalName || "Client agreement"}</p>
                  <a className="mt-3 inline-flex h-10 items-center rounded-md bg-[#4b5d8c] px-4 text-sm font-semibold text-white" href={projectClient.agreementDocument.url} rel="noreferrer" target="_blank">
                    Open document
                  </a>
                </article>
              ) : (
                <p className="text-sm text-[#596274]">No agreement document attached to this project yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#d3d8e3] bg-white p-5 shadow-sm">
            <h3 className="text-xl font-semibold">Project tickets</h3>
            <div className="mt-4">
              <label className="block text-sm font-semibold" htmlFor="ticketFilterMember">
                Filter by member
                <select className="mt-2 h-11 w-full rounded-md border border-[#cbd3df] px-3 outline-none focus:border-[#4b5d8c] focus:ring-2 focus:ring-[#4b5d8c]/20" id="ticketFilterMember" onChange={(event) => onTicketFilterChange(event.target.value)} value={ticketFilterMemberId}>
                  <option value="all">All members</option>
                  {(project.members || []).map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 divide-y divide-[#edf0f4]">
              {tickets.map((ticket) => (
                <article className="py-4" key={ticket._id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold">{ticket.title}</h4>
                      <p className="mt-1 text-sm text-[#596274]">Deadline: {formatDate(ticket.deadline)}</p>
                      <p className="mt-1 text-sm text-[#596274]">Assigned to {ticket.assignedTo?.name || "member"}</p>
                    </div>
                    <button className="rounded-md border border-[#cbd3df] px-3 py-1 text-sm font-semibold" onClick={() => routeTo(`/member/tickets/${ticket._id}`)} type="button">
                      View ticket
                    </button>
                  </div>
                </article>
              ))}
              {!tickets.length ? <p className="py-8 text-sm text-[#596274]">No tickets raised for this project.</p> : null}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}

function TicketDetail({ onBack, ticket }) {
  if (!ticket) {
    return <p className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 text-sm text-[#596274]">Loading ticket...</p>;
  }

  return (
    <section className="mt-8 rounded-lg border border-[#d3d8e3] bg-white p-5 shadow-sm">
      <button className="rounded-md border border-[#cbd3df] bg-white px-3 py-1 text-sm font-semibold" onClick={onBack} type="button">
        Back to dashboard
      </button>
      <p className="mt-5 text-sm font-semibold text-[#4b5d8c]">{ticket.project?.name || "Project"}</p>
      <h2 className="mt-2 text-3xl font-bold">{ticket.title}</h2>
      <p className="mt-3 text-sm text-[#596274]">Deadline: {formatDate(ticket.deadline)}</p>
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
