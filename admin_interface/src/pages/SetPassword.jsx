import { useMemo, useState } from "react";
import { setPassword as submitPasswordSetup } from "../api/admin";

function SetPassword() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const role = useMemo(() => new URLSearchParams(window.location.search).get("role") || "member", []);
  const [password, setPassword] = useState("");
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
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5 py-8 text-[#151b20]">
      <form className="w-full max-w-md rounded-lg border border-[#d8dde5] bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b4f1d]">OrbitDesk {role}</p>
        <h1 className="mt-3 text-3xl font-bold">Set password</h1>
        <label className="mt-6 block text-sm font-semibold" htmlFor="password">
          New password
          <input
            className="mt-2 h-12 w-full rounded-md border border-[#c7ced8] px-3 outline-none focus:border-[#6b4f1d] focus:ring-2 focus:ring-[#6b4f1d]/20"
            id="password"
            minLength="8"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {!token ? <p className="mt-4 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">Missing setup token.</p> : null}
        {status ? <p className="mt-4 rounded-md bg-[#e8f5eb] px-3 py-2 text-sm text-[#1b6b3a]">{status}</p> : null}
        {error ? <p className="mt-4 rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

        <button
          className="mt-5 h-12 w-full rounded-md bg-[#6b4f1d] font-semibold text-white transition hover:bg-[#563f16] disabled:cursor-not-allowed disabled:opacity-60"
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
