import { useState } from "react";
import { loginAdmin, setAdminSession } from "../api/admin";

function routeTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await loginAdmin(form);
      setAdminSession(session);
      routeTo(session.redirectTo || "/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell grid place-items-center">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="neo-panel hidden min-h-[620px] p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="eyebrow">OrbitDesk Admin</p>
            <h1 className="hero-title mt-5 max-w-lg">Modern operations command for product delivery.</h1>
            <p className="muted-text mt-4 max-w-xl text-base leading-7">
              Coordinate clients, members, planning, requests, and issue queues from a calm high-contrast workspace.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="neo-panel-soft p-5">
              <p className="eyebrow">Overview</p>
              <p className="mt-3 text-2xl font-semibold text-white">Bento dashboard</p>
              <p className="muted-text mt-2 text-sm leading-6">A premium card system designed for fast scanning and operational depth.</p>
            </article>
            <article className="neo-panel-soft p-5">
              <p className="eyebrow">Control</p>
              <p className="mt-3 text-2xl font-semibold text-white">Soft glass actions</p>
              <p className="muted-text mt-2 text-sm leading-6">Tactile interactions and accessible contrast instead of decorative-only neumorphism.</p>
            </article>
          </div>
        </div>

        <section className="neo-panel w-full max-w-md justify-self-center p-6">
          <p className="eyebrow">OrbitDesk Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Login</h1>
          <p className="muted-text mt-2 text-sm leading-6">
            Use your admin email and password to enter your workspace.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-white" htmlFor="email">
            Email
            <input
              className="neo-input"
              id="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </label>

            <label className="block text-sm font-semibold text-white" htmlFor="password">
            Password
            <input
              className="neo-input"
              id="password"
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>

            {error ? <p className="status-error">{error}</p> : null}

            <button className="neo-button h-11 w-full" disabled={loading} type="submit">
              {loading ? "Checking..." : "Login"}
            </button>
          </form>

          <div className="muted-text mt-5 flex items-center justify-between text-sm">
            <span>Need an account?</span>
            <button className="font-semibold text-cyan-300" onClick={() => window.location.assign("/get-started")} type="button">
              Get started
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default AdminLogin;
