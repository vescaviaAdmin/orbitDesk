import { useState } from "react";
import { forgotAdminPassword, loginAdmin, setAdminSession } from "../api/admin";

function routeTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
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
    setStatus("");

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

  async function handleForgotPassword() {
    if (!form.email.trim()) {
      setError("Enter your admin email first.");
      setStatus("");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");

    try {
      const result = await forgotAdminPassword(form.email);
      setStatus(result.message);
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
            <h1 className="hero-title mt-5 max-w-lg">Calm control for delivery operations.</h1>
            <p className="muted-text mt-4 max-w-xl text-base leading-7">
              Coordinate clients, members, planning, requests, and issue queues from a calm high-contrast workspace.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="neo-panel-soft p-5">
              <p className="eyebrow">Overview</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">Shared delivery view</p>
              <p className="muted-text mt-2 text-sm leading-6">Portfolio health, ticket load, and client visibility stay readable at a glance.</p>
            </article>
            <article className="neo-panel-soft p-5">
              <p className="eyebrow">Control</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">Consistent workflows</p>
              <p className="muted-text mt-2 text-sm leading-6">Onboarding, project assignment, and ticket handling use one dependable control language.</p>
            </article>
          </div>
        </div>

        <section className="neo-panel w-full max-w-md justify-self-center p-6">
          <p className="eyebrow">OrbitDesk Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Login</h1>
          <p className="muted-text mt-2 text-sm leading-6">
            Use your admin email and password to enter your workspace.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-900" htmlFor="email">
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

            <label className="block text-sm font-semibold text-slate-900" htmlFor="password">
              Password
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="neo-input mt-0"
                  id="password"
                  name="password"
                  onChange={updateField}
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                />
                <button
                  className="neo-button-secondary h-11 shrink-0 px-3"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Hide" : "View"}
                </button>
              </div>
            </label>

            {status ? <p className="status-success">{status}</p> : null}
            {error ? <p className="status-error">{error}</p> : null}

            <button className="neo-button h-11 w-full" disabled={loading} type="submit">
              {loading ? "Checking..." : "Login"}
            </button>
          </form>

          <div className="muted-text mt-5 flex items-center justify-between text-sm">
            <button className="auth-link" disabled={loading} onClick={handleForgotPassword} type="button">
              Forgot password?
            </button>
            <button className="auth-link" onClick={() => window.location.assign("/get-started")} type="button">
              Get started
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default AdminLogin;
