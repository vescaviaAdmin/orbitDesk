import { useState } from "react";
import AuthShell from "../components/auth/AuthShell";
import { loginClient, loginMember, requestClientOtp } from "../api/auth";

function persistSession(session) {
  localStorage.setItem("orbitdesk_session", JSON.stringify(session));
  window.history.pushState({}, "", session.redirectTo);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Login() {
  const [mode, setMode] = useState("client");
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

  async function handleClientOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");

    try {
      await requestClientOtp({ email: form.email, password: form.password });
      setClientOtpSent(true);
      setStatus("OTP sent to the client email.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const session =
        mode === "client"
          ? await loginClient(form)
          : await loginMember({ email: form.email, password: form.password });

      persistSession(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-6 flex rounded-lg border border-[#ccd8d0] bg-[#eef3ef] p-1">
        {["client", "member"].map((item) => (
          <button
            className={`h-11 flex-1 rounded-md text-sm font-semibold transition ${
              mode === item ? "bg-[#214f43] text-white shadow-sm" : "text-[#52635a]"
            }`}
            key={item}
            onClick={() => {
              setMode(item);
              setClientOtpSent(false);
              setError("");
              setStatus("");
            }}
            type="button"
          >
            {item === "client" ? "Client" : "Member"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={mode === "client" && !clientOtpSent ? handleClientOtp : handleLogin}>
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

        {mode === "client" && clientOtpSent ? (
          <div>
            <label className="text-sm font-semibold text-[#31423a]" htmlFor="otp">
              OTP
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
          {loading ? "Working..." : mode === "client" && !clientOtpSent ? "Send OTP" : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
