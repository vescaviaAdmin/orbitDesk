import { useState } from "react";
import AuthShell from "../components/auth/AuthShell";
import { useToast } from "../components/ui/Toast";
import { forgotMemberPassword, loginClient, loginMember, loginWithCredentials } from "../api/auth";

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
  const toast = useToast();
  const [clientOtpSent, setClientOtpSent] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "email" || name === "password" ? { otp: "" } : {}),
    }));

    if (name === "email" || name === "password") {
      setClientOtpSent(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);

    try {
      if (clientOtpSent) {
        const session = await loginClient(form);
        persistSession(session);
        return;
      }

      let result;

      try {
        result = await loginWithCredentials({
          email: form.email,
          password: form.password,
        });
      } catch (requestError) {
        result = await loginMember({
          email: form.email,
          password: form.password,
        }).catch(() => {
          throw requestError;
        });
      }

      if (result.requiresOtp) {
        setClientOtpSent(true);
        toast.success("A verification code has been sent to your registered email.");
        return;
      }

      persistSession(result);
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!form.email.trim()) {
      toast.error("Enter your member email first.");
      return;
    }

    setLoading(true);

    try {
      const result = await forgotMemberPassword(form.email);
      toast.success(result.message);
    } catch (requestError) {
      toast.error(requestError.message);
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
          <div className="mt-2 flex items-center gap-2">
            <input
              className="neo-input mt-0"
              id="password"
              name="password"
              onChange={updateField}
              type={showPassword ? "text" : "password"}
              value={form.password}
              required
            />
            <button
              className="neo-button-secondary h-11 shrink-0 px-3"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? "Hide" : "View"}
            </button>
          </div>
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

        <button
          className="neo-button h-12 w-full"
          disabled={loading}
          type="submit"
        >
          {loading ? "Working..." : clientOtpSent ? "Verify OTP" : "Continue"}
        </button>

        {!clientOtpSent ? (
          <div className="flex justify-end">
            <button className="text-sm font-semibold text-cyan-300" disabled={loading} onClick={handleForgotPassword} type="button">
              Forgot member password?
            </button>
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
}

export default Login;
