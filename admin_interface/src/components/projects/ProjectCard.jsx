import { StatusBadge, TicketIdBadge, TypeBadge } from "../ui/Badges";
import { formatDate, getProjectKey } from "../../lib/utils";

function ProjectCard({ onOpen, project }) {
  return (
    <button className="project-card w-full text-left" onClick={onOpen} type="button">
      <div className="flex min-h-[168px] flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{project.name}</h3>
            <p className="muted-text mt-2 line-clamp-2 text-sm">{project.description || "No project description provided yet."}</p>
          </div>
          <div className="ticket-card-action" aria-hidden="true">
            ↗
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          <TicketIdBadge ticketId={getProjectKey(project)} />
          <TypeBadge type={project.category || "project"} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {(project.clientCompany || project.clientEmail || "P").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{project.clientCompany || project.clientEmail || "No client assigned"}</p>
              <p className="muted-text text-xs">{project.members?.length || 0} members</p>
            </div>
          </div>
          <span className="muted-text text-xs">{formatDate(project.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

export default ProjectCard;
