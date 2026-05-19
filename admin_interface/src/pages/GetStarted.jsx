import { useState } from "react";
import { getStarted } from "../api/admin";

function GetStarted() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");

    try {
      const result = await getStarted(email);
      setStatus(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell grid place-items-center">
      <section className="neo-panel w-full max-w-md p-6">
        <p className="eyebrow">OrbitDesk Admin</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Get started</h1>
        <p className="muted-text mt-2 text-sm leading-6">
          Enter your admin email. We will send a password setup link so you can access your isolated workspace.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-white" htmlFor="email">
            Work email
            <input
              className="neo-input"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {status ? <p className="status-success">{status}</p> : null}
          {error ? <p className="status-error">{error}</p> : null}

          <button className="neo-button h-11 w-full" disabled={loading} type="submit">
            {loading ? "Sending..." : "Send setup link"}
          </button>
        </form>

        <div className="muted-text mt-5 flex items-center justify-between text-sm">
          <span>Already active?</span>
          <button className="font-semibold text-cyan-300" onClick={() => window.location.assign("/login")} type="button">
            Login
          </button>
        </div>
      </section>
    </main>
  );
}

export default GetStarted;
