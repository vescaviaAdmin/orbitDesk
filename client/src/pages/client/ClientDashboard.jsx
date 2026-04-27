import { useEffect, useMemo, useState } from "react";
import { createClientIssue, listClientIssues, listClientProjects } from "../../api/client";

const emptyIssueForm = {
  projectId: "",
  title: "",
  description: "",
};

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

function projectExpectedTime(project) {
  const datedPhases = (project.planning || []).filter((phase) => phase.endDate);
  if (!datedPhases.length) {
    return "Timeline not set";
  }

  const latestPhase = datedPhases.reduce((latest, phase) =>
    new Date(phase.endDate) > new Date(latest.endDate) ? phase : latest,
  );

  return formatDate(latestPhase.endDate);
}

function ClientDashboard() {
  const session = JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState("raise");

  const projectSummaries = useMemo(
    () =>
      projects.map((entry) => {
        const currentPhase = resolveCurrentPhase(entry.project.planning || []);
        const currentSprint = resolveCurrentSprint(currentPhase);
        const totalTickets = entry.tickets.length;
        const solvedTickets = entry.tickets.filter((ticket) => ticket.status === "resolved").length;

        return {
          ...entry,
          currentPhase,
          currentSprint,
          solvedTickets,
          totalTickets,
          expectedTime: projectExpectedTime(entry.project),
        };
      }),
    [projects],
  );

  const overviewCards = useMemo(
    () => [
      { label: "Projects", value: projectSummaries.length, tone: "text-[#214f43]" },
      {
        label: "Solved tickets",
        value: projectSummaries.reduce((sum, project) => sum + project.solvedTickets, 0),
        tone: "text-[#214f43]",
      },
      {
        label: "Open issues",
        value: issues.filter((issue) => issue.status === "open").length,
        tone: "text-[#7a4f1a]",
      },
      {
        label: "Reviewing",
        value: issues.filter((issue) => issue.status === "reviewing").length,
        tone: "text-[#243c5a]",
      },
    ],
    [issues, projectSummaries],
  );

  useEffect(() => {
    async function loadClientWorkspace() {
      setLoading(true);
      setError("");

      try {
        const [projectData, issueData] = await Promise.all([listClientProjects(), listClientIssues()]);
        const nextProjects = projectData.projects || [];
        setProjects(nextProjects);
        setActiveProjectIndex((current) => {
          if (!nextProjects.length) {
            return 0;
          }

          return Math.min(current, nextProjects.length - 1);
        });
        setIssues(issueData.issues || []);
        setIssueForm((current) => ({
          ...current,
          projectId: current.projectId || nextProjects[0]?.project?._id || "",
        }));
        setShowProjectDetails(false);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadClientWorkspace();
  }, []);

  function updateIssueForm(event) {
    const { name, value } = event.target;
    setIssueForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleIssueSubmit(event) {
    event.preventDefault();

    if (!issueForm.projectId) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await createClientIssue(issueForm.projectId, {
        title: issueForm.title,
        description: issueForm.description,
      });

      setIssues((current) => [data.issue, ...current]);
      setIssueForm((current) => ({
        ...emptyIssueForm,
        projectId: current.projectId,
      }));
      setStatus(data.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const activeProject = projectSummaries[activeProjectIndex] || null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6f7f3_0%,#f8fbf9_45%,#f3f5ef_100%)] px-5 py-8 text-[#17201c]">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2e7d68]">Client Workspace</p>
          <h1 className="mt-3 text-4xl font-bold">Welcome, {session.user?.name || "client"}</h1>
          <p className="mt-3 text-sm leading-6 text-[#5a6760]">
            Follow delivery progress, review active phases, and raise issues without leaving the workspace.
          </p>
        </div>

        {status ? <p className="mt-5 rounded-md bg-[#e8f5eb] px-3 py-2 text-sm text-[#1b6b3a]">{status}</p> : null}
        {error ? <p className="mt-5 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((item) => (
            <article className="rounded-2xl border border-[#d9dfd7] bg-white/90 p-5 shadow-sm" key={item.label}>
              <p className="text-sm font-semibold text-[#5a6760]">{item.label}</p>
              <strong className={`mt-2 block text-3xl ${item.tone}`}>{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className={`h-12 rounded-xl px-5 text-sm font-semibold transition ${
              activePanel === "raise" ? "bg-[#214f43] text-white" : "border border-[#c7d2cb] bg-white text-[#31423a]"
            }`}
            onClick={() => setActivePanel("raise")}
            type="button"
          >
            Need admin attention
          </button>
          <button
            className={`h-12 rounded-xl px-5 text-sm font-semibold transition ${
              activePanel === "track" ? "bg-[#243c5a] text-white" : "border border-[#c7d2cb] bg-white text-[#31423a]"
            }`}
            onClick={() => setActivePanel("track")}
            type="button"
          >
            Track your issues
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            {activeProject ? (
              <article className="rounded-[1.5rem] border border-[#d9dfd7] bg-white/92 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e7d68]">{activeProject.project.status}</p>
                    <h2 className="mt-2 text-2xl font-semibold">{activeProject.project.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#5a6760]">
                      {activeProject.project.description || "No project summary added yet."}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-[#f2f6f3] px-4 py-3 text-sm text-[#415048]">
                      <p className="font-semibold text-[#17201c]">Expected completion</p>
                      <p className="mt-1">{activeProject.expectedTime}</p>
                    </div>
                    {projectSummaries.length > 1 ? (
                      <div className="flex gap-2">
                        {activeProjectIndex > 0 ? (
                          <button
                            aria-label="Previous project"
                            className="grid h-11 w-11 place-items-center rounded-full border border-[#c7d2cb] bg-white text-lg font-semibold text-[#31423a] transition hover:border-[#214f43] hover:text-[#214f43]"
                            onClick={() => {
                              setActiveProjectIndex((current) => Math.max(current - 1, 0));
                              setShowProjectDetails(false);
                            }}
                            type="button"
                          >
                            &larr;
                          </button>
                        ) : null}
                        {activeProjectIndex < projectSummaries.length - 1 ? (
                          <button
                            aria-label="Next project"
                            className="grid h-11 w-11 place-items-center rounded-full border border-[#c7d2cb] bg-white text-lg font-semibold text-[#31423a] transition hover:border-[#214f43] hover:text-[#214f43]"
                            onClick={() => {
                              setActiveProjectIndex((current) => Math.min(current + 1, projectSummaries.length - 1));
                              setShowProjectDetails(false);
                            }}
                            type="button"
                          >
                            &rarr;
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <MetricCard label="Current phase" value={activeProject.currentPhase?.name || "Not set"} />
                  <MetricCard label="Current sprint" value={activeProject.currentSprint?.name || "Not set"} />
                  <MetricCard label="Solved tickets" value={`${activeProject.solvedTickets}/${activeProject.totalTickets || 0}`} />
                  <MetricCard label="Client issues" value={String(activeProject.issues.length)} />
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <DetailCard
                    title="Phase outcome"
                    text={activeProject.currentPhase?.outcome || "No active phase outcome has been defined yet."}
                  />
                  <DetailCard
                    title="Sprint outcome"
                    text={activeProject.currentSprint?.outcome || "No current sprint outcome has been defined yet."}
                  />
                </div>

                <div className="mt-5">
                  <button
                    className="h-11 rounded-md border border-[#c7d2cb] bg-white px-4 text-sm font-semibold text-[#31423a] transition hover:border-[#214f43] hover:text-[#214f43]"
                    onClick={() => setShowProjectDetails((current) => !current)}
                    type="button"
                  >
                    {showProjectDetails ? "Hide details" : "View details"}
                  </button>
                </div>

                {showProjectDetails ? (
                  <div className="mt-5 space-y-4 rounded-2xl border border-[#e4e9e3] bg-[#fbfcfa] p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a8780]">Team</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(activeProject.project.members || []).map((member) => (
                          <span className="rounded-full bg-white px-3 py-1 text-sm text-[#415048]" key={member._id}>
                            {member.name}
                          </span>
                        ))}
                        {!activeProject.project.members?.length ? <span className="text-sm text-[#5a6760]">No members assigned.</span> : null}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a8780]">Planned phases</p>
                      <div className="mt-3 space-y-3">
                        {(activeProject.project.planning || []).map((phase, phaseIndex) => (
                          <article className="rounded-xl border border-[#e4e9e3] bg-white p-4" key={`${phase.name}-${phaseIndex}`}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="font-semibold text-[#17201c]">{phase.name || `Phase ${phaseIndex + 1}`}</h3>
                                <p className="mt-1 text-sm text-[#5a6760]">
                                  {phase.startDate || phase.endDate
                                    ? `${formatDate(phase.startDate)} to ${formatDate(phase.endDate)}`
                                    : "Timeline not set"}
                                </p>
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a8780]">
                                {phase.sprints?.length || 0} sprints
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[#5a6760]">{phase.outcome || "No phase outcome defined."}</p>
                          </article>
                        ))}
                        {!activeProject.project.planning?.length ? <p className="text-sm text-[#5a6760]">No planning details added yet.</p> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
                {projectSummaries.length > 1 ? (
                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a8780]">
                    Project {activeProjectIndex + 1} of {projectSummaries.length}
                  </div>
                ) : null}
              </article>
            ) : null}
            {!activeProject ? (
              <article className="rounded-[1.5rem] border border-[#d9dfd7] bg-white/92 p-5 shadow-sm">
                <p className="text-sm text-[#5a6760]">{loading ? "Loading projects..." : "No active projects assigned to this client yet."}</p>
              </article>
            ) : null}

          </section>

          <section className="space-y-6">
            {activePanel === "raise" ? (
              <form className="rounded-[1.5rem] border border-[#d9dfd7] bg-white/92 p-5 shadow-sm" onSubmit={handleIssueSubmit}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a4f1a]">Raise Issue</p>
                  <h2 className="mt-2 text-2xl font-semibold">Need admin attention?</h2>
                  <p className="mt-2 text-sm leading-6 text-[#5a6760]">
                    Share blockers, review concerns, or anything that needs escalation from your side.
                  </p>
                </div>

                <label className="mt-5 block text-sm font-semibold" htmlFor="projectId">
                  Project
                  <select
                    className="mt-2 h-12 w-full rounded-md border border-[#c7d2cb] bg-white px-3 outline-none focus:border-[#2e7d68] focus:ring-2 focus:ring-[#2e7d68]/20"
                    id="projectId"
                    name="projectId"
                    onChange={updateIssueForm}
                    value={issueForm.projectId}
                  >
                    <option value="">Select project</option>
                    {projectSummaries.map((entry) => (
                      <option key={entry.project._id} value={entry.project._id}>
                        {entry.project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block text-sm font-semibold" htmlFor="title">
                  Issue title
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-[#c7d2cb] px-3 outline-none focus:border-[#2e7d68] focus:ring-2 focus:ring-[#2e7d68]/20"
                    id="title"
                    name="title"
                    onChange={updateIssueForm}
                    required
                    value={issueForm.title}
                  />
                </label>

                <label className="mt-4 block text-sm font-semibold" htmlFor="description">
                  Details
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-md border border-[#c7d2cb] px-3 py-3 outline-none focus:border-[#2e7d68] focus:ring-2 focus:ring-[#2e7d68]/20"
                    id="description"
                    name="description"
                    onChange={updateIssueForm}
                    value={issueForm.description}
                  />
                </label>

                <button
                  className="mt-5 h-12 w-full rounded-md bg-[#214f43] font-semibold text-white transition hover:bg-[#183d34] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading || !issueForm.projectId}
                  type="submit"
                >
                  {loading ? "Submitting..." : "Submit issue"}
                </button>
              </form>
            ) : null}

            {activePanel === "track" ? (
              <section className="rounded-[1.5rem] border border-[#d9dfd7] bg-white/92 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#243c5a]">Issues</p>
                    <h2 className="mt-2 text-2xl font-semibold">Track your issues</h2>
                  </div>
                  <span className="rounded-full bg-[#eef2f8] px-3 py-1 text-sm font-semibold text-[#243c5a]">{issues.length}</span>
                </div>

                <div className="mt-5 space-y-3">
                  {issues.map((issue) => (
                    <article className="rounded-xl border border-[#e4e9e3] bg-[#fbfcfa] p-4" key={issue._id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{issue.title}</h3>
                          <p className="mt-1 text-sm text-[#5a6760]">{issue.project?.name || "Project"}</p>
                        </div>
                        <span className="rounded-full bg-[#f4efe2] px-3 py-1 text-xs font-semibold capitalize text-[#7a4f1a]">
                          {issue.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#5a6760]">{issue.description || "No issue details provided."}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a968e]">{formatDate(issue.createdAt)}</p>
                    </article>
                  ))}
                  {!issues.length ? <p className="text-sm text-[#5a6760]">{loading ? "Loading issues..." : "No issues raised yet."}</p> : null}
                </div>
              </section>
            ) : null}

          </section>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#e4e9e3] bg-[#fbfcfa] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a8780]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#17201c]">{value}</p>
    </div>
  );
}

function DetailCard({ title, text }) {
  return (
    <div className="rounded-xl border border-[#e4e9e3] bg-[#fbfcfa] p-4">
      <p className="text-sm font-semibold text-[#17201c]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#5a6760]">{text}</p>
    </div>
  );
}

export default ClientDashboard;
