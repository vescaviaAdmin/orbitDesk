import { useState } from "react";
import FormInput from "../components/FormInput";
import SectionCard from "../components/SectionCard";
import { requestLoginOtp } from "../config/api";

function LoginPage({ defaultIdentifier = "", onOtpRequested }) {
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await requestLoginOtp({
        identifier,
        password,
      });
      onOtpRequested(result.data.identifier, result.data.email);
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
          Client login
        </p>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Login with username or email
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          Enter your identifier and password. The server will send a one-time code to the linked email.
        </p>

        <div className="mt-8 grid gap-5">
          <FormInput label="Username or email" name="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="john.doe or john@example.com" required />
          <FormInput label="Password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required />
        </div>

        {error ? (
          <p className="mt-5 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--bg-soft)", color: "var(--text-primary)" }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #5b4dff 0%, #2f6bff 100%)" }}
        >
          {submitting ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>

      <div className="grid gap-6">
        <SectionCard
          title="Flexible identifier"
          text="Clients can start login with either their unique username or their unique email address."
        />
        <SectionCard
          title="Email OTP"
          text="The OTP always goes to the email attached to that account, even if the login started with username."
        />
      </div>
    </section>
  );
}

export default LoginPage;
