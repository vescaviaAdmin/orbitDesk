function AuthShell({ children }) {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-1 py-6 lg:px-4">
        <section className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="neo-panel hidden min-h-[620px] overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="eyebrow">OrbitDesk Platform</p>
              <h1 className="hero-title mt-5 max-w-lg">Delivery operations with a softer, sharper control layer.</h1>
              <p className="muted-text mt-4 max-w-xl text-base leading-7">
                Manage projects, approvals, tickets, and client communication from a focused workspace built for modern product teams.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="neo-panel-soft p-5">
                <p className="eyebrow">Realtime</p>
                <p className="mt-3 text-2xl font-semibold text-white">Project visibility</p>
                <p className="muted-text mt-2 text-sm leading-6">Track phases, sprints, and escalations without digging through disconnected tools.</p>
              </article>
              <article className="neo-panel-soft p-5">
                <p className="eyebrow">Secure</p>
                <p className="mt-3 text-2xl font-semibold text-white">Role-based access</p>
                <p className="muted-text mt-2 text-sm leading-6">Separate admin, member, and client experiences with clear pathways and strong readability.</p>
              </article>
            </div>
          </div>

          <section className="neo-panel w-full p-5 sm:p-7">
            {children}
          </section>
        </section>
      </div>
    </main>
  );
}

export default AuthShell;
