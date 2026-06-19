import { cloneElement, useEffect, useId, useMemo, useState } from "react";
import { createClientIssue, listClientIssues, listClientProjects } from "../../api/client";
import { useToast } from "../../components/ui/Toast";
import { formatDate, getInitials, getStatusTone, normalizeStatus } from "../../lib/member-utils";
import { clearPortalSession, getPortalSession, isSessionExpiredError, redirectToPortalLogin } from "../../lib/session";

const emptyIssueForm = {
  projectId: "",
  title: "",
  description: "",
};

const NAV_ITEMS = [
  ["overview", "Overview"],
  ["projects", "Projects"],
  ["issues", "Issues"],
  ["raise", "Raise Issue"],
  ["updates", "Updates"],
];

const VIEW_TITLES = {
  overview: "Overview",
  projects: "Projects",
  issues: "Issues",
  raise: "Raise Issue",
  updates: "Updates",
};

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
  const toast = useToast();
  const session = getPortalSession();
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!session.token || session.role !== "client") {
      redirectToPortalLogin();
    }
  }, [session.role, session.token]);

  useEffect(() => {
    async function loadClientWorkspace() {
      setLoading(true);

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
        if (isSessionExpiredError(requestError)) {
          return;
        }
        toast.error(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadClientWorkspace();
  }, []);

  function logoutClient() {
    clearPortalSession();
    redirectToPortalLogin();
  }

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

  const overviewStats = [
    {
      label: "Projects",
      note: "Shared with you",
      value: projectCards.length,
      tone: "neutral",
    },
    {
      label: "Open issues",
      note: "Waiting on review",
      value: issues.filter((issue) => (issue.status || "").toLowerCase() === "open").length,
      tone: "pending",
    },
    {
      label: "In progress",
      note: "Actively moving",
      value: issues.filter((issue) => (issue.status || "").toLowerCase() === "in_progress").length,
      tone: "assigned",
    },
    {
      label: "Resolved",
      note: "Closed feedback",
      value: issues.filter((issue) => ["resolved", "done", "closed"].includes((issue.status || "").toLowerCase())).length,
      tone: "completed",
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

    setSubmitting(true);

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
      toast.success(data.message);
      setActiveView("issues");
    } catch (requestError) {
      if (isSessionExpiredError(requestError)) {
        return;
      }
      toast.error(requestError.message);
    } finally {
      setSubmitting(false);
    }
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
              <p className="muted-text truncate text-xs">Client workspace</p>
            </div>
          </div>

          <nav aria-label="Client workspace" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            <p className="sidebar-section-label">Workspace</p>
            {NAV_ITEMS.map(([key, label]) => (
              <button
                aria-current={activeView === key ? "page" : undefined}
                className={`sidebar-link w-full justify-between ${activeView === key ? "sidebar-link-active" : ""}`}
                key={key}
                onClick={() => setActiveView(key)}
                type="button"
              >
                <span>{label}</span>
                {key === "issues" && issues.length ? (
                  <span className="glass-chip !px-2 !py-0.5 text-[11px]">{issues.length}</span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--border)] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <span className="avatar-badge">{getInitials(session.user?.name || session.user?.email)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{session.user?.name || "Client workspace"}</p>
                <p className="muted-text truncate text-xs">{session.user?.email || "Stakeholder account"}</p>
              </div>
            </div>
            <button className="secondary-button mt-3 w-full" onClick={logoutClient} type="button">
              Logout
            </button>
          </div>
        </aside>

        <section className="workspace-main">
          <header className="workspace-topbar">
            <div className="min-w-0">
              <h1 className="section-title truncate">{VIEW_TITLES[activeView] || "Overview"}</h1>
              <p className="muted-text mt-1 text-sm">Track delivery progress and share feedback with your team.</p>
            </div>
            <div className="action-row">
              <button className="secondary-button" onClick={() => setActiveView("projects")} type="button">
                View projects
              </button>
              <button className="primary-button" onClick={() => setActiveView("raise")} type="button">
                Raise issue
              </button>
            </div>
          </header>

          <div className="workspace-content space-y-6">
            {loading && !projectCards.length && !issues.length ? <WorkspaceSkeleton /> : null}

            {activeView === "overview" && (!loading || projectCards.length || issues.length) ? (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {overviewStats.map((item) => (
                    <SummaryMetric key={item.label} {...item} />
                  ))}
                </section>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <section className="surface-card p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="compact-panel-title">
                          {activeProject?.project?.name || "No project assigned yet"}
                        </h2>
                        <p className="muted-text mt-2 text-sm leading-6">
                          {activeProject?.project?.description || "Your current project summary will appear here once a workspace is shared."}
                        </p>
                      </div>
                      {activeProject ? <StatusBadge status={activeProject.project.status} /> : null}
                    </div>

                    {activeProject ? (
                      <>
                        <div className="mt-5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-foreground">Progress</span>
                            <span className="font-semibold text-foreground">{activeProject.progress}%</span>
                          </div>
                          <div className="progress-track mt-2">
                            <div className="progress-fill" style={{ width: `${activeProject.progress}%` }} />
                          </div>
                        </div>

                        <div className="mt-5 strip-grid">
                          <InfoTile label="Expected delivery" value={activeProject.eta} />
                          <InfoTile label="Open issues" value={activeProject.openIssues} />
                          <InfoTile label="Project type" value={activeProject.project.category || "-"} />
                        </div>

                        <div className="action-row mt-5">
                          <button className="secondary-button" onClick={() => setActiveView("projects")} type="button">
                            Open workspace
                          </button>
                          <button className="secondary-button" onClick={() => setActiveView("issues")} type="button">
                            View issues
                          </button>
                        </div>
                      </>
                    ) : (
                      <EmptyCard copy="No assigned projects yet. Your client workspace will populate once the team shares a project with you." />
                    )}
                  </section>

                  <section className="surface-card p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="compact-panel-title">Recent updates</h2>
                      <button className="text-xs font-semibold text-primary" onClick={() => setActiveView("updates")} type="button">
                        View all
                      </button>
                    </div>
                    <ul className="mt-4 space-y-4">
                      {updates.map((item) => (
                        <li className="flex gap-3" key={item}>
                          <span aria-hidden="true" className="status-dot status-dot-assigned mt-2" />
                          <p className="text-sm leading-6 text-foreground">{item}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </>
            ) : null}

            {activeView === "projects" ? (
              <section className="surface-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Assigned workspaces</h2>
                    <p className="muted-text mt-2 text-sm">Open a project to review progress, issues, and delivery timing.</p>
                  </div>
                  <span className="glass-chip">{projectCards.length}</span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {projectCards.map((entry) => (
                    <button
                      className={`task-card w-full text-left ${activeProjectId === entry.project._id ? "!border-primary ring-2 ring-ring/20" : ""}`}
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
                            <h3 className="text-sm font-semibold text-foreground">{entry.project.name}</h3>
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

                      <div className="mt-4 flex items-center justify-end gap-1">
                        <span className="text-sm font-semibold text-primary">Open workspace</span>
                        <span aria-hidden="true" className="text-muted-foreground">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                  {!projectCards.length ? (
                    <EmptyCard copy={loading ? "Loading projects..." : "No assigned projects yet."} />
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeView === "issues" ? (
              <section className="surface-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">Submitted feedback and blockers</h2>
                    <p className="muted-text mt-2 text-sm">Every issue stays tied to the project it affects.</p>
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
                            <h3 className="text-sm font-semibold text-foreground">{issue.title}</h3>
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
                  {!issues.length ? (
                    <EmptyCard copy={loading ? "Loading issues..." : "No issues yet. Raise your first issue to start the conversation."} />
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeView === "raise" ? (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <form className="surface-card p-6" onSubmit={handleIssueSubmit}>
                  <h2 className="section-title">Share feedback with the team</h2>
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
                    <input
                      className="input-field mt-2"
                      name="title"
                      onChange={updateIssueForm}
                      placeholder="Production payment error on checkout"
                      value={issueForm.title}
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      className="input-field mt-2 min-h-32"
                      name="description"
                      onChange={updateIssueForm}
                      placeholder="Describe what happened, what you expected, and any supporting context."
                      value={issueForm.description}
                    />
                  </Field>

                  <button className="primary-button mt-6 w-full" disabled={submitting} type="submit">
                    {submitting ? "Submitting..." : "Submit issue"}
                  </button>
                </form>

                <section className="surface-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="section-title">Helpful submission notes</h2>
                      <p className="muted-text mt-2 text-sm">A clear issue helps the delivery team respond faster.</p>
                    </div>
                    <span className="glass-chip">{issues.length} raised</span>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {[
                      "Use a short, specific title so the delivery team can triage quickly.",
                      "Include the affected project to keep feedback connected to the right workspace.",
                      "Add reproduction details or screenshots out-of-band if the issue is complex.",
                    ].map((item) => (
                      <li className="surface-muted p-4 text-sm text-foreground" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 space-y-3">
                    {issues.slice(0, 4).map((issue) => (
                      <article className="surface-muted p-4" key={issue._id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{issue.title}</h3>
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
              <section className="surface-card p-6">
                <h2 className="section-title">Latest workspace signals</h2>
                <p className="muted-text mt-2 text-sm">Status snapshots from your active project and issue activity.</p>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {updates.map((item) => (
                    <article className="surface-muted p-5" key={item}>
                      <div className="flex gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted font-semibold text-foreground">
                          OD
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">Workspace update</p>
                          <p className="muted-text mt-2 text-sm">{item}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryMetric({ label, note, tone, value }) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`status-dot status-dot-${tone === "neutral" ? "neutral" : tone}`} />
        <p className="muted-text text-sm font-semibold">{label}</p>
      </div>
      <strong className="metric-value">{value}</strong>
      <p className="muted-text mt-2 text-sm">{note}</p>
    </article>
  );
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="loading-skeleton h-32" key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="loading-skeleton h-72" />
        <div className="loading-skeleton h-72" />
      </div>
    </div>
  );
}

function Field({ children, error, label }) {
  const fieldId = useId();

  return (
    <div className="mt-5">
      <label className="block text-sm font-semibold text-foreground" htmlFor={fieldId}>
        {label}
      </label>
      {cloneElement(children, { id: fieldId })}
      {error ? (
        <span className="mt-2 block text-sm font-medium text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="surface-muted p-4">
      <p className="muted-text text-xs font-semibold">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = getStatusTone(status);
  const className =
    tone === "completed"
      ? "badge badge-success"
      : tone === "assigned"
        ? "badge badge-info"
        : tone === "pending"
          ? "badge badge-warning"
          : "badge badge-muted";

  return (
    <span className={className}>
      <span aria-hidden="true" className={`status-dot status-dot-${tone === "neutral" ? "neutral" : tone}`} />
      {normalizeStatus(status)}
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

export default ClientDashboard;
