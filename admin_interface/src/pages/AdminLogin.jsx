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
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f7f8fb_0%,#edf2f7_100%)] px-5 py-8 text-[#161c24]">
      <section className="w-full max-w-md rounded-[1.5rem] border border-[#d7dee8] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#315c8f]">OrbitDesk Admin</p>
        <h1 className="mt-3 text-3xl font-semibold">Login</h1>
        <p className="mt-2 text-sm leading-6 text-[#5b6677]">
          Use your admin email and password to enter your workspace.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[#253041]" htmlFor="email">
            Email
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#c8d2e0] px-3 outline-none focus:border-[#315c8f] focus:ring-2 focus:ring-[#315c8f]/15"
              id="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label className="block text-sm font-semibold text-[#253041]" htmlFor="password">
            Password
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#c8d2e0] px-3 outline-none focus:border-[#315c8f] focus:ring-2 focus:ring-[#315c8f]/15"
              id="password"
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>

          {error ? <p className="rounded-xl bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

          <button
            className="h-11 w-full rounded-xl bg-[#243c5a] text-sm font-semibold text-white transition hover:bg-[#1b3049] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-[#5b6677]">
          <span>Need an account?</span>
          <button className="font-semibold text-[#315c8f]" onClick={() => window.location.assign("/get-started")} type="button">
            Get started
          </button>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;
