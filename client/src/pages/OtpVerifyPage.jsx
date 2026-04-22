import { useState } from "react";
import FormInput from "../components/FormInput";
import SectionCard from "../components/SectionCard";
import { verifyLoginOtp } from "../config/api";

function OtpVerifyPage({ identifier, email, onVerified }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await verifyLoginOtp({
        identifier,
        otp,
      });
      onVerified(result.data);
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
          OTP verification
        </p>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Enter the code sent to your email
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          OTP sent to {email}. This completes the login after the password check.
        </p>

        <div className="mt-8 grid gap-5">
          <FormInput label="One-time password" name="otp" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6-digit code" required />
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
          {submitting ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      <div className="grid gap-6">
        <SectionCard
          title="Two-step login"
          text="The server only accepts OTP verification after a valid password check has already happened."
        />
        <SectionCard
          title="Testing flow"
          text="Use the same identifier you submitted on the previous step. For username login, the OTP still arrives at the linked email."
        />
      </div>
    </section>
  );
}

export default OtpVerifyPage;
