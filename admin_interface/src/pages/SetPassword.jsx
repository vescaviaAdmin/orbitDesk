import { useMemo, useState } from "react";
import { setPassword as submitPasswordSetup } from "../api/admin";

function resolveClientAppUrl() {
  const configuredUrl = import.meta.env.VITE_CLIENT_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const { hostname, origin, protocol } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:5173`;
  }

  if (hostname.includes("orbitdesk-admin")) {
    return origin.replace("orbitdesk-admin", "orbitdesk-client");
  }

  return origin;
}

function SetPassword() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const role = useMemo(() => new URLSearchParams(window.location.search).get("role") || "member", []);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");

    try {
      await submitPasswordSetup(role, { token, password });
      setStatus(`Password set. You can now login from the ${role} login screen.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell grid place-items-center">
      <form className="neo-panel w-full max-w-md p-6" onSubmit={handleSubmit}>
        <p className="eyebrow">OrbitDesk {role}</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Set password</h1>
        <label className="mt-6 block text-sm font-semibold text-white" htmlFor="password">
          New password
          <div className="mt-2 flex items-center gap-2">
            <input
              className="neo-input mt-0"
              id="password"
              minLength="8"
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={password}
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

        {!token ? <p className="status-error mt-4">Missing setup token.</p> : null}
        {status ? <p className="status-success mt-4">{status}</p> : null}
        {error ? <p className="status-error mt-4">{error}</p> : null}

        {status ? (
          <button
            className="neo-button-secondary mt-4 h-11 w-full"
            onClick={() =>
              window.location.assign(role === "admin" ? "/login" : `${resolveClientAppUrl()}/`)
            }
            type="button"
          >
            Go to login
          </button>
        ) : null}

        <button
          className="neo-button mt-5 h-12 w-full"
          disabled={loading || !token}
          type="submit"
        >
          {loading ? "Saving..." : "Set password"}
        </button>
      </form>
    </main>
  );
}

export default SetPassword;
