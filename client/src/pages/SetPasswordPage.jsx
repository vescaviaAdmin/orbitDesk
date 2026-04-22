import { useEffect, useState } from "react";
import FormInput from "../components/FormInput";
import SectionCard from "../components/SectionCard";
import { setClientPassword } from "../config/api";

function SetPasswordPage({ initialEmail, initialToken, onPasswordSet }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [token, setToken] = useState(initialToken || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEmail(initialEmail || "");
    setToken(initialToken || "");
  }, [initialEmail, initialToken]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result = await setClientPassword({
        email,
        token,
        password,
        confirmPassword,
      });
      setSuccess(result.message);
      onPasswordSet(email);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form
        className="rounded-[2rem] border p-8 shadow-2xl sm:p-10"
        style={{
          borderColor: "var(--border-strong)",
          backgroundColor: "var(--bg-secondary)",
          boxShadow: "0 32px 80px var(--shadow-color)",
        }}
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--text-muted)" }}>
          Account security
        </p>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Set your password
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          Opened from the email link. After this, login requires password plus email OTP.
        </p>

        <div className="mt-8 grid gap-5">
          <FormInput label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="john@example.com" required />
          <FormInput label="Setup token" name="token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Token from email link" required />
          <FormInput label="Password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" required />
          <FormInput label="Confirm password" name="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" required />
        </div>

        {error ? (
          <p className="mt-5 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--bg-soft)", color: "var(--text-primary)" }}>
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-5 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--bg-panel)", color: "var(--text-primary)" }}>
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #5b4dff 0%, #2f6bff 100%)" }}
        >
          {submitting ? "Saving password..." : "Set password"}
        </button>
      </form>

      <div className="grid gap-6">
        <SectionCard
          title="Email link support"
          text="The form auto-fills token and email from the query string when opened from the signup email."
        />
        <SectionCard
          title="Password rules"
          text="Passwords must be at least 8 characters. They are hashed on the server before saving."
        />
      </div>
    </section>
  );
}

export default SetPasswordPage;
