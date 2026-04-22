function Hero({ apiMessage, theme, onToggleTheme }) {
  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border p-8 shadow-2xl sm:p-10"
      style={{
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "0 32px 80px var(--shadow-color)",
      }}
    >
      <div
        className="absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(91, 77, 255, 0.26)" }}
      />
      <div
        className="absolute bottom-0 right-20 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(47, 107, 255, 0.18)" }}
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p
            className="text-sm font-semibold uppercase tracking-[0.35em]"
            style={{ color: "var(--text-muted)" }}
          >
            OrbitDesk signup
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Launch a complete client onboarding flow with real uploads.
          </h1>
          <p
            className="mt-5 max-w-2xl text-base leading-7"
            style={{ color: "var(--text-secondary)" }}
          >
            Multi-step account creation, MongoDB persistence, and Cloudinary-backed
            document upload in one clean flow.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div
              className="rounded-full border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--border-soft)",
                backgroundColor: "var(--bg-panel)",
              }}
            >
              API status: {apiMessage}
            </div>
            <div
              className="rounded-full border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--border-soft)",
                backgroundColor: "var(--bg-soft)",
                color: "var(--text-muted)",
              }}
            >
              Theme: {theme}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-full border px-5 py-3 text-sm font-semibold transition hover:scale-[1.02]"
          style={{
            borderColor: "var(--border-strong)",
            backgroundColor: "var(--bg-panel)",
            color: "var(--text-primary)",
          }}
        >
          Switch to {theme === "dark" ? "light" : "dark"} mode
        </button>
      </div>
    </section>
  );
}

export default Hero;
