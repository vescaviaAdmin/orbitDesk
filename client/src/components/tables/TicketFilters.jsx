import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function TicketFilters({
  assigneeScope = "all",
  defaultAssigneeScope = "all",
  defaultProjectId = "all",
  defaultSort = "updatedAt",
  defaultStatus = "all",
  onAssigneeScopeChange,
  onProjectChange,
  onQueryChange,
  onSortChange,
  onStatusChange,
  projectId = "",
  projects = [],
  query = "",
  showAssigneeScopeFilter = false,
  showProjectFilter = true,
  sort = "updatedAt",
  status = "",
}) {
  const activeProjectId = projectId || "all";
  const activeStatus = status || "all";
  const hasFilters = Boolean(
    query ||
      (showProjectFilter && activeProjectId !== defaultProjectId) ||
      activeStatus !== defaultStatus ||
      sort !== defaultSort ||
      (showAssigneeScopeFilter && assigneeScope !== defaultAssigneeScope),
  );

  return (
    <div className="table-toolbar flex flex-wrap items-center gap-3">
      <input
        aria-label="Search issues"
        className="input-field input-field-compact max-w-sm"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search by title, project, or status"
        type="search"
        value={query}
      />

      {showProjectFilter ? (
        <Select onValueChange={onProjectChange} value={activeProjectId}>
          <SelectTrigger aria-label="Filter by project" className="w-[180px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project._id} value={project._id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        ) : null}

      <Select onValueChange={onStatusChange} value={activeStatus}>
        <SelectTrigger aria-label="Filter by status" className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="cancel">Cancel</SelectItem>
        </SelectContent>
      </Select>

      {showAssigneeScopeFilter ? (
        <Select onValueChange={onAssigneeScopeChange} value={assigneeScope}>
          <SelectTrigger aria-label="Filter by issue ownership" className="w-[150px]">
            <SelectValue placeholder="All issues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All issues</SelectItem>
            <SelectItem value="mine">My issues</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      <Select onValueChange={onSortChange} value={sort}>
        <SelectTrigger aria-label="Sort tickets" className="w-[190px]">
          <SelectValue placeholder="Recently updated" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updatedAt">Recently updated</SelectItem>
          <SelectItem value="deadline">Due date</SelectItem>
          <SelectItem value="title">Title</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters ? (
        <button
          className="secondary-button"
          onClick={() => {
            onQueryChange("");
            if (showProjectFilter) {
              onProjectChange(defaultProjectId);
            }
            onStatusChange(defaultStatus);
            if (showAssigneeScopeFilter) {
              onAssigneeScopeChange(defaultAssigneeScope);
            }
            onSortChange(defaultSort);
          }}
          type="button"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
