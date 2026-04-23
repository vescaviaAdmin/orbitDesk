function ClientDashboard() {
  const session = JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-8 text-[#17201c]">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2e7d68]">Client Interface</p>
        <h1 className="mt-3 text-4xl font-bold">Welcome, {session.user?.name || "client"}</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Project requests", "Invoices", "Support tickets"].map((item) => (
            <article className="rounded-lg border border-[#d8ddd6] bg-white p-5 shadow-sm" key={item}>
              <h2 className="text-lg font-semibold">{item}</h2>
              <p className="mt-2 text-sm text-[#5a6760]">Client-only workspace area.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ClientDashboard;
