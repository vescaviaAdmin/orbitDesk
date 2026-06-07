import {
  countPlannedTickets,
  countProjectSprints,
  getProjectTone,
  projectExpectedTime,
} from "../../lib/member-utils";
import { routeTo } from "../../lib/navigation";
import StatusBadge from "../member/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

function EmptyTableState({ copy }) {
  return (
    <div className="empty-state py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-sm font-bold text-muted-foreground">
        OD
      </div>
      <p className="muted-text mt-4 text-sm">{copy}</p>
    </div>
  );
}

export default function ProjectTable({ loading = false, projects = [] }) {
  if (!projects.length) {
    return (
      <div className="rounded-md border border-border bg-card">
        <EmptyTableState copy={loading ? "Loading projects..." : "No assigned projects yet."} />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Planned</TableHead>
            <TableHead>Phases</TableHead>
            <TableHead>Sprints</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const tone = getProjectTone(project.status);

            return (
              <TableRow key={project._id}>
                <TableCell className="min-w-[220px] max-w-sm py-2">
                  <button className="table-primary-link" onClick={() => routeTo(`/member/projects/${project._id}`)} type="button">
                    <span aria-hidden="true" className={`status-dot status-dot-${tone} shrink-0`} />
                    <span className="table-link-text">
                      <span className="table-link-title">{project.name}</span>
                      {project.description ? <span className="table-link-meta">{project.description}</span> : null}
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <StatusBadge status={project.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{projectExpectedTime(project)}</TableCell>
                <TableCell>{countPlannedTickets(project.planning)}</TableCell>
                <TableCell>{project.planning?.length || 0}</TableCell>
                <TableCell>{countProjectSprints(project)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
