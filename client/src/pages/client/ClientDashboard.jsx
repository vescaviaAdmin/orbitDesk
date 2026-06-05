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

function normalizeStatus(status) {
  return (status || "open").replaceAll("_", " ");
}

function getProjectEta(project) {
  const dates = (project.planning || [])
    .flatMap((phase) => [phase.endDate, ...(phase.sprints || []).map((sprint) => sprint.endDate)])
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (!dates.length) {
    return "Timeline not shared";
  }

  const latest = dates.reduce((max, date) => (date > max ? date : max), dates[0]);
  return formatDate(latest);
}

function getProjectProgress(project, issues) {
  const scopedIssues = issues.filter((issue) => issue.project?._id === project._id);
  if (!scopedIssues.length) {
    return project.status === "completed" ? 100 : project.status === "active" ? 55 : 20;
  }

  const resolved = scopedIssues.filter((issue) => ["resolved", "done", "closed"].includes((issue.status || "").toLowerCase())).length;
  return Math.max(10, Math.round((resolved / scopedIssues.length) * 100));
}

function ClientDashboard() {
  const session = JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    async function loadClientWorkspace() {
      setLoading(true);
      setError("");

      try {
        const [projectData, issueData] = await Promise.all([listClientProjects(), listClientIssues()]);
        const nextProjects = projectData.projects || [];
        const nextIssues = issueData.issues || [];

        setProjects(nextProjects);
        setIssues(nextIssues);

        const initialProjectId = nextProjects[0]?.project?._id || "";
        setActiveProjectId(initialProjectId);
        setIssueForm((current) => ({
          ...current,
          projectId: current.projectId || initialProjectId,
        }));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadClientWorkspace();
  }, []);

  const projectCards = useMemo(
    () =>
      projects.map((entry) => {
        const project = entry.project;
        const projectIssues = issues.filter((issue) => issue.project?._id === project._id);

        return {
          ...entry,
          eta: getProjectEta(project),
          issueCount: projectIssues.length,
          progress: getProjectProgress(project, issues),
          openIssues: projectIssues.filter((issue) => ["open", "in_progress"].includes((issue.status || "").toLowerCase())).length,
        };
      }),
    [issues, projects],
  );

  const activeProject = projectCards.find((entry) => entry.project._id === activeProjectId) || projectCards[0] || null;
  const activeProjectIssues = activeProject ? issues.filter((issue) => issue.project?._id === activeProject.project._id) : issues;

  const overviewStats = [
    {
      label: "Projects",
      note: "Visible workspaces",
      value: projectCards.length,
    },
    {
      label: "Open issues",
      note: "Waiting on review",
      value: issues.filter((issue) => (issue.status || "").toLowerCase() === "open").length,
    },
    {
      label: "In progress",
      note: "Actively moving",
      value: issues.filter((issue) => (issue.status || "").toLowerCase() === "in_progress").length,
    },
    {
      label: "Resolved",
      note: "Closed feedback",
      value: issues.filter((issue) => ["resolved", "done", "closed"].includes((issue.status || "").toLowerCase())).length,
    },
  ];

  const updates = [
    activeProject ? `${activeProject.project.name} is currently marked ${normalizeStatus(activeProject.project.status)}.` : "No assigned projects yet.",
    activeProject ? `Expected delivery window: ${activeProject.eta}.` : "A delivery timeline will appear once a project is connected.",
    issues.length ? `${issues.length} total issues raised from this client workspace.` : "No issues raised yet.",
  ];

  function updateIssueForm(event) {
    const { name, value } = event.target;
    setIssueForm((current) => ({
      ...current,
      [name]: value,
    }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
  }

  async function handleIssueSubmit(event) {
    event.preventDefault();

    const nextErrors = {
      projectId: issueForm.projectId ? "" : "Select a project.",
      title: issueForm.title.trim() ? "" : "Issue title is required.",
    };

    setFormErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    setStatus("");
    setError("");

    try {
      const data = await createClientIssue(issueForm.projectId, {
        title: issueForm.title.trim(),
        description: issueForm.description.trim(),
      });

      setIssues((current) => [data.issue, ...current]);
      setIssueForm((current) => ({
        ...emptyIssueForm,
        projectId: current.projectId,
      }));
      setStatus(data.message);
      setActiveView("issues");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

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
              <p className="muted-text text-xs">Clear project visibility</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              ["overview", "Overview", "01"],
              ["projects", "Projects", "02"],
              ["issues", "Issues", "03"],
              ["raise", "Raise Issue", "04"],
              ["updates", "Updates", "05"],
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
            <p className="muted-text mt-1 text-sm">{session.user?.email || "Stakeholder account"}</p>
          </div>
        </aside>

        <section className="workspace-main">
          {activeView === "overview" ? (
            <header className="workspace-header p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="eyebrow">Client Workspace</p>
                  <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-3xl">Project visibility without the clutter</h1>
                  <p className="muted-text mt-3 max-w-3xl text-sm leading-6">
                    Use the buttons below to open the exact workspace section you need instead of scanning a long page.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="primary-button" onClick={() => setActiveView("raise")} type="button">
                    Raise issue
                  </button>
                  <button className="secondary-button" onClick={() => setActiveView("projects")} type="button">
                    View projects
                  </button>
                </div>
              </div>

              {status ? <p className="status-success mt-5">{status}</p> : null}
              {error ? <p className="status-error mt-5">{error}</p> : null}
            </header>
          ) : (
            <>
              {status ? <p className="status-success mt-6">{status}</p> : null}
              {error ? <p className="status-error mt-6">{error}</p> : null}
            </>
          )}

          {activeView === "overview" ? (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewStats.map((item) => (
                <article className="surface-card p-4" key={item.label}>
                  <p className="muted-text text-sm font-semibold">{item.label}</p>
                  <strong className="mt-2 block text-2xl font-semibold tracking-[-0.03em] text-slate-900">{item.value}</strong>
                  <p className="muted-text mt-2 text-sm">{item.note}</p>
                </article>
              ))}
            </section>
          ) : null}

          {activeView === "overview" ? (
            <div className="mt-6">
              <section className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Current Project</p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-900">
                      {activeProject?.project?.name || "No project assigned yet"}
                    </h2>
                    <p className="muted-text mt-3 text-sm leading-6">
                      {activeProject?.project?.description || "Your current project summary will appear here once a workspace is shared."}
                    </p>
                  </div>
                  {activeProject ? <StatusBadge status={activeProject.project.status} /> : null}
                </div>

                {activeProject ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Expected delivery" value={activeProject.eta} />
                    <InfoTile label="Open issues" value={activeProject.openIssues} />
                    <InfoTile label="Progress" value={`${activeProject.progress}%`} />
                    <InfoTile label="Project type" value={activeProject.project.category || "-"} />
                  </div>
                ) : (
                  <EmptyCard copy="No assigned projects yet. Your client workspace will populate once the team shares a project with you." />
                )}
              </section>
            </div>
          ) : null}

          {activeView === "projects" ? (
            <section className="surface-card mt-6 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Projects</p>
                  <h2 className="section-title mt-3">Assigned workspaces</h2>
                </div>
                <span className="glass-chip">{projectCards.length}</span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {projectCards.map((entry) => (
                  <button
                    className={`surface-card w-full border-2 p-4 text-left ${activeProjectId === entry.project._id ? "border-violet-300" : "border-transparent hover:border-violet-200"}`}
                    key={entry.project._id}
                    onClick={() => {
                      setActiveProjectId(entry.project._id);
                      setIssueForm((current) => ({ ...current, projectId: entry.project._id }));
                      setActiveView("overview");
                    }}
                    type="button"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3 md:block">
                          <h3 className="text-sm font-semibold text-slate-900">{entry.project.name}</h3>
                          <div className="md:hidden">
                            <StatusBadge status={entry.project.status} />
                          </div>
                        </div>
                        <p className="muted-text mt-2 text-sm leading-5">{entry.project.description || "No project summary shared yet."}</p>
                      </div>
                      <div className="hidden md:block">
                        <StatusBadge status={entry.project.status} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <InfoTile label="Expected delivery" value={entry.eta} />
                      <InfoTile label="Open issues" value={entry.openIssues} />
                      <InfoTile label="Total issues" value={entry.issueCount} />
                      <InfoTile label="Project type" value={entry.project.category || "-"} />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <span className="text-sm font-semibold text-violet-700">Open workspace</span>
                    </div>
                  </button>
                ))}
                {!projectCards.length ? <EmptyCard copy={loading ? "Loading projects..." : "No assigned projects yet."} /> : null}
              </div>
            </section>
          ) : null}

          {activeView === "issues" ? (
            <section className="surface-card mt-6 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Issues</p>
                  <h2 className="section-title mt-3">Submitted feedback and blockers</h2>
                </div>
                <button className="primary-button" onClick={() => setActiveView("raise")} type="button">
                  Raise another issue
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {issues.map((issue) => (
                  <article className="task-card" key={issue._id}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900">{issue.title}</h3>
                          <p className="muted-text mt-1 text-sm">{issue.project?.name || "Project"}</p>
                        </div>
                        <StatusBadge status={issue.status} />
                      </div>
                      <p className="muted-text text-sm leading-5">{issue.description || "No issue details provided."}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="glass-chip">{formatDate(issue.createdAt)}</span>
                        <span className="muted-text">Reported by {session.user?.name || "client"}</span>
                      </div>
                    </div>
                  </article>
                ))}
                {!issues.length ? <EmptyCard copy={loading ? "Loading issues..." : "No issues yet. Raise your first issue to start the conversation."} /> : null}
              </div>
            </section>
          ) : null}

          {activeView === "raise" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <form className="surface-card p-6" onSubmit={handleIssueSubmit}>
                <p className="eyebrow">Raise Issue</p>
                <h2 className="section-title mt-3">Share feedback with the team</h2>
                <p className="muted-text mt-3 text-sm leading-6">
                  Submit blockers, bugs, or product feedback tied to the relevant project workspace.
                </p>

                <Field error={formErrors.projectId} label="Project">
                  <select className="input-field mt-2" name="projectId" onChange={updateIssueForm} value={issueForm.projectId}>
                    <option value="">Select project</option>
                    {projectCards.map((entry) => (
                      <option key={entry.project._id} value={entry.project._id}>
                        {entry.project.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field error={formErrors.title} label="Issue title">
                  <input className="input-field mt-2" name="title" onChange={updateIssueForm} placeholder="Production payment error on checkout" value={issueForm.title} />
                </Field>

                <Field label="Description">
                  <textarea className="input-field mt-2 min-h-32" name="description" onChange={updateIssueForm} placeholder="Describe what happened, what you expected, and any supporting context." value={issueForm.description} />
                </Field>

                <button className="primary-button mt-6 w-full" disabled={loading} type="submit">
                  {loading ? "Submitting..." : "Submit issue"}
                </button>
              </form>

              <section className="surface-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Issue Guide</p>
                    <h2 className="section-title mt-3 text-xl">Helpful submission notes</h2>
                  </div>
                  <span className="glass-chip">{issues.length} raised</span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    "Use a short, specific title so the delivery team can triage quickly.",
                    "Include the affected project to keep feedback connected to the right workspace.",
                    "Add reproduction details or screenshots out-of-band if the issue is complex.",
                  ].map((item) => (
                    <div className="surface-muted p-4 text-sm text-slate-700" key={item}>
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {issues.slice(0, 4).map((issue) => (
                    <article className="surface-muted p-4" key={issue._id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{issue.title}</h3>
                          <p className="muted-text mt-1 text-sm">{issue.project?.name || "Project"}</p>
                        </div>
                        <StatusBadge status={issue.status} />
                      </div>
                    </article>
                  ))}
                  {!issues.length ? <EmptyCard copy="No submitted issues yet." /> : null}
                </div>
              </section>
            </div>
          ) : null}

          {activeView === "updates" ? (
            <section className="surface-card mt-6 p-6">
              <p className="eyebrow">Updates</p>
              <h2 className="section-title mt-3">Latest workspace signals</h2>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {updates.map((item) => (
                  <article className="surface-muted p-5" key={item}>
                    <div className="flex gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 font-semibold text-violet-700">
                        OD
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Workspace update</p>
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

function Field({ children, error, label }) {
  return (
    <label className="mt-5 block text-sm font-semibold text-slate-900">
      {label}
      {children}
      {error ? <span className="mt-2 block text-sm font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="surface-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = (status || "open").toLowerCase();
  const className =
    normalized === "resolved" || normalized === "done" || normalized === "completed" || normalized === "closed"
      ? "badge badge-success"
      : normalized === "in_progress" || normalized === "active"
        ? "badge badge-info"
        : normalized === "paused"
          ? "badge badge-danger"
          : "badge badge-warning";

  return <span className={className}>{normalizeStatus(status)}</span>;
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

export default ClientDashboard;
