import { useState } from "react";
import AuthShell from "../components/auth/AuthShell";
import { loginClient, loginWithCredentials } from "../api/auth";

function persistSession(session) {
  if (session.role === "admin") {
    const serializedSession = encodeURIComponent(JSON.stringify(session));
    const targetUrl = new URL(`/auth-complete?session=${serializedSession}`, session.appUrl || "http://localhost:5174");
    window.location.assign(targetUrl.toString());
    return;
  }

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
      <div className="neo-panel-soft mb-6 overflow-hidden p-5">
        <div className="glass-chip inline-flex px-3 py-1.5">
          <p className="eyebrow !tracking-[0.24em]">OrbitDesk Access</p>
        </div>
        <p className="mt-4 text-2xl font-semibold text-white">Sign in to continue your work.</p>
        <p className="muted-text mt-2 text-sm leading-6">Secure access for project delivery, approvals, and ongoing collaboration.</p>
      </div>

      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="text-sm font-semibold text-white" htmlFor="email">
            Email
          </label>
          <input
            className="neo-input"
            id="email"
            name="email"
            onChange={updateField}
            type="email"
            value={form.email}
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-white" htmlFor="password">
            Password
          </label>
          <input
            className="neo-input"
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
            <label className="text-sm font-semibold text-white" htmlFor="otp">
              Verification code
            </label>
            <input
              className="neo-input"
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

        {status ? <p className="status-success">{status}</p> : null}
        {error ? <p className="status-error">{error}</p> : null}

        <button
          className="neo-button h-12 w-full"
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
