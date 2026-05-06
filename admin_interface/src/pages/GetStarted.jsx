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
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f7f8fb_0%,#edf2f7_100%)] px-5 py-8 text-[#161c24]">
      <section className="w-full max-w-md rounded-[1.5rem] border border-[#d7dee8] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#315c8f]">OrbitDesk Admin</p>
        <h1 className="mt-3 text-3xl font-semibold">Get started</h1>
        <p className="mt-2 text-sm leading-6 text-[#5b6677]">
          Enter your admin email. We will send a password setup link so you can access your isolated workspace.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[#253041]" htmlFor="email">
            Work email
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#c8d2e0] px-3 outline-none focus:border-[#315c8f] focus:ring-2 focus:ring-[#315c8f]/15"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {status ? <p className="rounded-xl bg-[#e9f5ee] px-3 py-2 text-sm text-[#17663c]">{status}</p> : null}
          {error ? <p className="rounded-xl bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

          <button
            className="h-11 w-full rounded-xl bg-[#243c5a] text-sm font-semibold text-white transition hover:bg-[#1b3049] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Sending..." : "Send setup link"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-[#5b6677]">
          <span>Already active?</span>
          <button className="font-semibold text-[#315c8f]" onClick={() => window.location.assign("/login")} type="button">
            Login
          </button>
        </div>
      </section>
    </main>
  );
}

export default GetStarted;
