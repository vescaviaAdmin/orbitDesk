function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#17201c]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="space-y-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2e7d68]">OrbitDesk</p>
            <h1 className="mt-3 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Workspace access for clients and delivery members.
            </h1>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-[#c7d7ce] bg-white p-4 shadow-sm">
              <strong className="block text-base">Client login</strong>
              <span className="mt-1 block text-[#5a6760]">Email, password, and OTP verification.</span>
            </div>
            <div className="rounded-lg border border-[#c7d7ce] bg-white p-4 shadow-sm">
              <strong className="block text-base">Member login</strong>
              <span className="mt-1 block text-[#5a6760]">Email and password access for invited members.</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#d8ddd6] bg-white p-5 shadow-xl shadow-[#17201c]/10 sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}

export default AuthShell;
