function WelcomePage({ user, onLogout }) {
  return (
    <section
      className="mt-8 rounded-[2rem] border p-8 shadow-2xl sm:p-10"
      style={{
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "0 32px 80px var(--shadow-color)",
      }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--text-muted)" }}>
        Welcome
      </p>
      <h2 className="mt-2 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Hello, {user.clientName}
      </h2>
      <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        Login is complete. This is the temporary post-login welcome page.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border p-5" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--bg-panel)" }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Client ID</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>{user.clientId}</p>
        </div>
        <div className="rounded-[1.5rem] border p-5" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--bg-panel)" }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Email</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>{user.email}</p>
        </div>
        <div className="rounded-[1.5rem] border p-5" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--bg-panel)" }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Username</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>{user.username}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="mt-8 rounded-full border px-5 py-3 text-sm font-semibold transition"
        style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--bg-panel)", color: "var(--text-primary)" }}
      >
        Logout
      </button>
    </section>
  );
}

export default WelcomePage;
