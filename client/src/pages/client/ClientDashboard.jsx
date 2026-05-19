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

function countStatus(items, statuses) {
  return items.filter((item) => statuses.includes(item.status)).length;
}

function getInitials(value) {
  return (value || "OD")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getProjectProgress(summary) {
  if (!summary.totalSprints) {
    return summary.currentPhase ? 35 : 10;
  }

  const planned = summary.totalSprints;
  const currentIndex = (summary.project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0);
  return Math.min(100, Math.round((Math.max(1, currentIndex) / planned) * 100));
}

function ClientDashboard() {
  const session = JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

  const projectSummaries = useMemo(
    () =>
      projects.map((entry) => {
        const currentPhase = resolveCurrentPhase(entry.project.planning || []);
        const currentSprint = resolveCurrentSprint(currentPhase);
        const totalPhases = entry.project.planning?.length || 0;
        const totalSprints = (entry.project.planning || []).reduce((total, phase) => total + (phase.sprints?.length || 0), 0);

        return {
          ...entry,
          currentPhase,
          currentSprint,
          totalPhases,
          totalSprints,
          expectedTime: projectExpectedTime(entry.project),
        };
      }),
    [projects],
  );

  useEffect(() => {
    async function loadClientWorkspace() {
      setLoading(true);
      setError("");

      try {
        const [projectData, issueData] = await Promise.all([listClientProjects(), listClientIssues()]);
        const nextProjects = projectData.projects || [];
        setProjects(nextProjects);
        setActiveProjectIndex((current) => Math.min(current, Math.max(nextProjects.length - 1, 0)));
        setIssues(issueData.issues || []);
        setIssueForm((current) => ({
          ...current,
          projectId: current.projectId || nextProjects[0]?.project?._id || "",
        }));
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
      setActiveView("feedback");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const activeProject = projectSummaries[activeProjectIndex] || null;
  const overviewCards = [
    { label: "Assigned projects", value: projectSummaries.length, note: "Delivery workspaces linked to your account", view: "projects" },
    { label: "Open issues", value: countStatus(issues, ["open"]), note: "Needs admin review or acknowledgment", view: "tasks" },
    { label: "Resolved issues", value: countStatus(issues, ["resolved", "done"]), note: "Closed feedback and fixes", view: "feedback" },
    { label: "In progress", value: countStatus(issues, ["in_progress"]), note: "Currently being worked on", view: "tasks" },
  ];

  const priorityIssues = issues.slice(0, 5);
  const notifications = [
    activeProject?.currentSprint?.name ? `Current sprint: ${activeProject.currentSprint.name}` : "Sprint planning has not been shared yet.",
    activeProject?.expectedTime ? `Expected completion: ${activeProject.expectedTime}` : "Timeline has not been committed yet.",
    issues.length ? `${issues.length} total issues raised from this workspace.` : "No issues raised yet.",
  ];

  return (
    <main className="workspace-shell">
      <div className="workspace-layout">
        <aside className="workspace-sidebar p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
              OD
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">OrbitDesk Client</p>
              <p className="muted-text text-xs">Visibility, progress, feedback</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              ["dashboard", "Dashboard", "01"],
              ["projects", "Assigned Projects", "02"],
              ["tasks", "Issue View", "03"],
              ["progress", "Progress Tracking", "04"],
              ["feedback", "Comments / Feedback", "05"],
              ["notifications", "Notifications", "06"],
            ].map(([key, label, icon]) => (
              <button
                className={`sidebar-link w-full justify-between ${activeView === key ? "sidebar-link-active" : ""}`}
                key={key}
                onClick={() => setActiveView(key)}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                    {icon}
                  </span>
                  {label}
                </span>
              </button>
            ))}
          </nav>

          <div className="surface-muted mt-8 p-4">
            <p className="text-sm font-semibold text-slate-900">{session.user?.name || "Client workspace"}</p>
            <p className="muted-text mt-1 text-sm">{session.user?.email || "Project stakeholder"}</p>
          </div>
        </aside>

        <section className="workspace-main">
          <header className="workspace-header p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow">Client Workspace</p>
                <h1 className="hero-title mt-3">Project progress without the noise</h1>
                <p className="muted-text mt-3 max-w-3xl text-sm leading-6">
                  Track delivery, review what needs attention today, and raise feedback directly inside a project-aware workspace.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="primary-button" onClick={() => setActiveView("feedback")} type="button">
                  Raise issue
                </button>
                <button className="secondary-button" onClick={() => setActiveView("projects")} type="button">
                  Open projects
                </button>
              </div>
            </div>

            {status ? <p className="status-success mt-5">{status}</p> : null}
            {error ? <p className="status-error mt-5">{error}</p> : null}
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((item) => (
              <button className="metric-card w-full cursor-pointer text-left hover:border-violet-200 hover:shadow-md" key={item.label} onClick={() => setActiveView(item.view)} type="button">
                <p className="muted-text text-sm font-semibold">{item.label}</p>
                <strong className="metric-value">{item.value}</strong>
                <p className="muted-text mt-2 text-sm">{item.note}</p>
              </button>
            ))}
          </section>

          {activeView === "dashboard" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="surface-card p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="eyebrow">Active Project</p>
                    <h2 className="section-title mt-3">{activeProject?.project?.name || "No project assigned"}</h2>
                    <p className="muted-text mt-3 text-sm leading-6">
                      {activeProject?.project?.description || "Project summary will appear here when a workspace is assigned."}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="secondary-button"
                      disabled={activeProjectIndex === 0}
                      onClick={() => setActiveProjectIndex((current) => Math.max(current - 1, 0))}
                      type="button"
                    >
                      Prev
                    </button>
                    <button
                      className="secondary-button"
                      disabled={activeProjectIndex >= projectSummaries.length - 1}
                      onClick={() => setActiveProjectIndex((current) => Math.min(current + 1, projectSummaries.length - 1))}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {activeProject ? (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <ProjectStat label="Current phase" value={activeProject.currentPhase?.name || "Not set"} onClick={() => setActiveView("progress")} />
                      <ProjectStat label="Current sprint" value={activeProject.currentSprint?.name || "Not set"} onClick={() => setActiveView("progress")} />
                      <ProjectStat label="Expected delivery" value={activeProject.expectedTime} onClick={() => setActiveView("progress")} />
                      <ProjectStat label="Project progress" value={`${getProjectProgress(activeProject)}%`} onClick={() => setActiveView("progress")} />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-900">Delivery progress</span>
                        <span className="muted-text">{getProjectProgress(activeProject)}%</span>
                      </div>
                      <div className="progress-track mt-2">
                        <div className="progress-fill" style={{ width: `${getProjectProgress(activeProject)}%` }} />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      <InfoPanel title="Phase outcome" text={activeProject.currentPhase?.outcome || "No phase outcome shared yet."} />
                      <InfoPanel title="Sprint outcome" text={activeProject.currentSprint?.outcome || "No sprint outcome shared yet."} />
                    </div>
                  </>
                ) : (
                  <div className="empty-state mt-6">
                    <p className="text-lg font-semibold text-slate-900">No projects yet</p>
                    <p className="muted-text mt-2 text-sm">
                      Your assigned project workspaces will appear here once the admin team links them to your account.
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <article className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="eyebrow">Today</p>
                      <h2 className="section-title mt-3 text-xl">Needs attention</h2>
                    </div>
                    <span className="glass-chip">{priorityIssues.length}</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {priorityIssues.length ? (
                      priorityIssues.map((issue) => (
                        <button className="surface-muted w-full p-4 text-left hover:border-violet-200" key={issue._id} onClick={() => setActiveView("tasks")} type="button">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{issue.title}</p>
                              <p className="muted-text mt-1 text-sm">{issue.project?.name || "Project"}</p>
                            </div>
                            <IssueStatusBadge status={issue.status} />
                          </div>
                          <p className="muted-text mt-3 text-sm">{issue.description || "No extra details shared."}</p>
                        </button>
                      ))
                    ) : (
                      <EmptyCard copy="No issues yet. Create your first issue to start tracking work." />
                    )}
                  </div>
                </article>

                <article className="surface-card p-6">
                  <p className="eyebrow">Recent Updates</p>
                  <h2 className="section-title mt-3 text-xl">Workspace notifications</h2>
                  <div className="mt-5 space-y-3">
                    {notifications.map((item) => (
                      <div className="surface-muted flex gap-3 p-4" key={item}>
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                          i
                        </span>
                        <p className="text-sm text-slate-700">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          ) : null}

          {activeView === "projects" ? (
            <section className="surface-card mt-6 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Assigned Projects</p>
                  <h2 className="section-title mt-3">Project visibility</h2>
                </div>
                <span className="glass-chip">{projectSummaries.length}</span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {projectSummaries.map((item, index) => (
                  <button
                    className={`surface-card border-2 p-5 ${activeProjectIndex === index ? "border-violet-300" : "border-transparent"}`}
                    key={item.project._id}
                    onClick={() => {
                      setActiveProjectIndex(index);
                      setActiveView("dashboard");
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.project.name}</h3>
                        <p className="muted-text mt-2 text-sm">{item.project.description || "No project summary available."}</p>
                      </div>
                      <span className="secondary-button">
                        Open
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <ProjectStat label="Current phase" value={item.currentPhase?.name || "Not set"} />
                      <ProjectStat label="Current sprint" value={item.currentSprint?.name || "Not set"} />
                      <ProjectStat label="Expected completion" value={item.expectedTime} />
                      <ProjectStat label="Phases / Sprints" value={`${item.totalPhases} / ${item.totalSprints}`} />
                    </div>
                  </button>
                ))}
                {!projectSummaries.length ? <EmptyCard copy={loading ? "Loading projects..." : "No assigned projects yet."} /> : null}
              </div>
            </section>
          ) : null}

          {activeView === "tasks" ? (
            <section className="surface-card mt-6 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Issue View</p>
                  <h2 className="section-title mt-3">Raised tasks and blockers</h2>
                </div>
                <span className="glass-chip">{issues.length}</span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {issues.map((issue) => (
                  <article className="task-card" key={issue._id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{issue.title}</h3>
                        <p className="muted-text mt-1 text-sm">{issue.project?.name || "Project"}</p>
                      </div>
                      <IssueStatusBadge status={issue.status} />
                    </div>
                    <p className="muted-text mt-3 text-sm leading-6">{issue.description || "No issue details provided."}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="badge badge-info">{formatDate(issue.createdAt)}</span>
                      <span className="muted-text">Reported by {session.user?.name || "client"}</span>
                    </div>
                  </article>
                ))}
                {!issues.length ? <EmptyCard copy={loading ? "Loading issues..." : "No issues yet. Create your first issue to start tracking work."} /> : null}
              </div>
            </section>
          ) : null}

          {activeView === "progress" ? (
            <section className="surface-card mt-6 p-6">
              <div>
                <p className="eyebrow">Progress Tracking</p>
                <h2 className="section-title mt-3">Delivery plan snapshot</h2>
              </div>

              <div className="mt-6 space-y-4">
                {projectSummaries.map((item) => (
                  <article className="surface-muted p-5" key={item.project._id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.project.name}</h3>
                        <p className="muted-text mt-2 text-sm">{item.currentPhase?.name || "No active phase"} / {item.currentSprint?.name || "No active sprint"}</p>
                      </div>
                      <span className="badge badge-primary">Expected {item.expectedTime}</span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {(item.project.planning || []).map((phase, phaseIndex) => (
                        <div className="surface-card p-4" key={`${item.project._id}-${phaseIndex}`}>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phase {phaseIndex + 1}</p>
                          <h4 className="mt-2 font-semibold text-slate-900">{phase.name || `Phase ${phaseIndex + 1}`}</h4>
                          <p className="muted-text mt-2 text-sm">{phase.outcome || "No phase outcome defined."}</p>
                          <div className="mt-3 space-y-2">
                            {(phase.sprints || []).map((sprint, sprintIndex) => (
                              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3" key={`${phaseIndex}-${sprintIndex}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-semibold text-slate-900">{sprint.name || `Sprint ${sprintIndex + 1}`}</span>
                                  <span className="badge badge-info">{formatDate(sprint.endDate)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
                {!projectSummaries.length ? <EmptyCard copy="No planning shared yet." /> : null}
              </div>
            </section>
          ) : null}

          {activeView === "feedback" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <form className="surface-card p-6" onSubmit={handleIssueSubmit}>
                <p className="eyebrow">Comments / Feedback</p>
                <h2 className="section-title mt-3">Raise a project issue</h2>
                <p className="muted-text mt-3 text-sm leading-6">
                  Use this form for blockers, feedback, and anything the delivery team should review.
                </p>

                <label className="mt-5 block text-sm font-semibold text-slate-900" htmlFor="projectId">
                  Project
                  <select className="input-field" id="projectId" name="projectId" onChange={updateIssueForm} value={issueForm.projectId}>
                    <option value="">Select project</option>
                    {projectSummaries.map((entry) => (
                      <option key={entry.project._id} value={entry.project._id}>
                        {entry.project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="title">
                  Issue title
                  <input className="input-field" id="title" name="title" onChange={updateIssueForm} required value={issueForm.title} />
                </label>

                <label className="mt-4 block text-sm font-semibold text-slate-900" htmlFor="description">
                  Description
                  <textarea className="input-field min-h-32" id="description" name="description" onChange={updateIssueForm} value={issueForm.description} />
                </label>

                <button className="primary-button mt-5 w-full" disabled={loading || !issueForm.projectId} type="submit">
                  {loading ? "Submitting..." : "Submit issue"}
                </button>
              </form>

              <section className="surface-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Issue Feed</p>
                    <h2 className="section-title mt-3">Recent feedback</h2>
                  </div>
                  <span className="glass-chip">{issues.length}</span>
                </div>

                <div className="mt-5 space-y-3">
                  {issues.map((issue) => (
                    <article className="surface-muted p-4" key={issue._id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{issue.title}</h3>
                          <p className="muted-text mt-1 text-sm">{issue.project?.name || "Project"}</p>
                        </div>
                        <IssueStatusBadge status={issue.status} />
                      </div>
                      <p className="muted-text mt-3 text-sm leading-6">{issue.description || "No details shared."}</p>
                    </article>
                  ))}
                  {!issues.length ? <EmptyCard copy="No issues yet. Create your first issue to start tracking work." /> : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeView === "notifications" ? (
            <section className="surface-card mt-6 p-6">
              <p className="eyebrow">Notifications</p>
              <h2 className="section-title mt-3">Latest workspace updates</h2>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {notifications.map((item) => (
                  <article className="surface-muted p-5" key={item}>
                    <div className="flex gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 font-semibold text-violet-700">
                        OD
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">OrbitDesk update</p>
                        <p className="muted-text mt-2 text-sm">{item}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ProjectStat({ label, value, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`surface-muted w-full p-4 text-left ${onClick ? "cursor-pointer hover:border-violet-200 hover:shadow-md" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </Tag>
  );
}

function InfoPanel({ title, text }) {
  return (
    <div className="surface-muted p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="muted-text mt-3 text-sm leading-6">{text}</p>
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

function IssueStatusBadge({ status }) {
  const normalized = (status || "open").toLowerCase();
  const className =
    normalized === "resolved" || normalized === "done"
      ? "badge badge-success"
      : normalized === "in_progress"
        ? "badge badge-info"
        : "badge badge-warning";

  return <span className={className}>{normalized.replaceAll("_", " ")}</span>;
}

export default ClientDashboard;
