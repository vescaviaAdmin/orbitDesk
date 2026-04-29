import { useState } from "react";
import AuthShell from "../components/auth/AuthShell";
import { loginClient, loginWithCredentials } from "../api/auth";

function persistSession(session) {
  localStorage.setItem("orbitdesk_session", JSON.stringify(session));
  window.history.pushState({}, "", session.redirectTo);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Login() {
  const [clientOtpSent, setClientOtpSent] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");

    try {
      if (clientOtpSent) {
        const session = await loginClient(form);
        persistSession(session);
        return;
      }

      const result = await loginWithCredentials({
        email: form.email,
        password: form.password,
      });

      if (result.requiresOtp) {
        setClientOtpSent(true);
        setStatus("A verification code has been sent to your registered email.");
        return;
      }

      persistSession(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 rounded-2xl border border-[#ccd8d0] bg-[linear-gradient(135deg,#eef3ef_0%,#f8fbf8_100%)] px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e7d68]">OrbitDesk Access</p>
        <p className="mt-2 text-lg font-semibold text-[#23332d]">Sign in to continue your work.</p>
        <p className="mt-1 text-sm leading-6 text-[#52635a]">Secure access for project delivery, approvals, and ongoing collaboration.</p>
      </div>

      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="text-sm font-semibold text-[#31423a]" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 h-12 w-full rounded-md border border-[#bfcbc4] px-3 outline-none focus:border-[#2e7d68] focus:ring-2 focus:ring-[#2e7d68]/20"
            id="email"
            name="email"
            onChange={updateField}
            type="email"
            value={form.email}
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[#31423a]" htmlFor="password">
            Password
          </label>
          <input
            className="mt-2 h-12 w-full rounded-md border border-[#bfcbc4] px-3 outline-none focus:border-[#2e7d68] focus:ring-2 focus:ring-[#2e7d68]/20"
            id="password"
            name="password"
            onChange={updateField}
            type="password"
            value={form.password}
            required
          />
        </div>

        {clientOtpSent ? (
          <div>
            <label className="text-sm font-semibold text-[#31423a]" htmlFor="otp">
              Verification code
            </label>
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#bfcbc4] px-3 outline-none focus:border-[#2e7d68] focus:ring-2 focus:ring-[#2e7d68]/20"
              id="otp"
              inputMode="numeric"
              maxLength="6"
              name="otp"
              onChange={updateField}
              value={form.otp}
              required
            />
          </div>
        ) : null}

        {status ? <p className="rounded-md bg-[#e5f5ed] px-3 py-2 text-sm text-[#17633f]">{status}</p> : null}
        {error ? <p className="rounded-md bg-[#fde8e3] px-3 py-2 text-sm text-[#9f2f1f]">{error}</p> : null}

        <button
          className="h-12 w-full rounded-md bg-[#214f43] font-semibold text-white transition hover:bg-[#183d34] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Working..." : clientOtpSent ? "Verify OTP" : "Continue"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
