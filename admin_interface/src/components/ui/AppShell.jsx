import { cn } from "../../lib/utils";

export function Sidebar({ children }) {
  return <aside className="workspace-sidebar p-5">{children}</aside>;
}

export function Topbar({ children }) {
  return <header className="workspace-header p-6">{children}</header>;
}

export function PageHeader({ actions, description, eyebrow, title }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="hero-title mt-3">{title}</h1>
        {description ? <p className="muted-text mt-3 max-w-3xl text-sm leading-6">{description}</p> : null}
      </div>
      {actions ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions}</div> : null}
    </div>
  );
}

function AppShell({ children, className, sidebar, topbar }) {
  return (
    <main className={cn("workspace-shell", className)}>
      <div className="workspace-layout">
        {sidebar}
        <section className="workspace-main">
          {topbar}
          {children}
        </section>
      </div>
    </main>
  );
}

export default AppShell;
