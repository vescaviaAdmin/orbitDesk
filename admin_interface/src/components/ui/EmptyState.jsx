import { cn } from "../../lib/utils";

function EmptyState({ action, className, copy, title = "Nothing here yet" }) {
  return (
    <div className={cn("empty-state", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-sm font-bold text-[color:var(--primary-strong)]">
        OD
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{copy}</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
