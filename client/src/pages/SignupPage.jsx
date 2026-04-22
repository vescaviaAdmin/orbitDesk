import { useState } from "react";
import FormInput from "../components/FormInput";
import SectionCard from "../components/SectionCard";
import FileUploadField from "../components/FileUploadField";
import SignupSuccess from "../components/SignupSuccess";
import StepBadge from "../components/StepBadge";
import { signupClient } from "../config/api";

const initialForm = {
  clientName: "",
  companyName: "",
  companyLocation: "",
  companyWebsite: "",
  projectName: "",
  username: "",
  email: "",
};

const steps = ["Client details", "Company details", "Documents"];

function SignupPage({ submission, onSignedUp }) {
  const [step, setStep] = useState(0);
  const [formValues, setFormValues] = useState(initialForm);
  const [files, setFiles] = useState({
    signedAgreementCopy: null,
    govId: null,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    const { name } = event.target;

    setFiles((current) => ({
      ...current,
      [name]: selectedFile,
    }));
  }

  function validateCurrentStep() {
    if (step === 0) {
      return (
        formValues.clientName.trim() &&
        formValues.projectName.trim() &&
        formValues.username.trim() &&
        formValues.email.trim()
      );
    }

    if (step === 1) {
      return (
        formValues.companyName.trim() &&
        formValues.companyLocation.trim() &&
        formValues.companyWebsite.trim()
      );
    }

    return files.signedAgreementCopy && files.govId;
  }

  function nextStep() {
    if (!validateCurrentStep()) {
      setError("Please complete the required fields before moving forward.");
      return;
    }

    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateCurrentStep()) {
      setError("Please upload both required documents.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = new FormData();

    Object.entries(formValues).forEach(([key, value]) => {
      payload.append(key, value);
    });

    payload.append("signedAgreementCopy", files.signedAgreementCopy);
    payload.append("govId", files.govId);

    try {
      const result = await signupClient(payload);
      onSignedUp(result.data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submission) {
    return <SignupSuccess submission={submission} />;
  }

  return (
    <>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((title, index) => (
          <StepBadge
            key={title}
            step={index + 1}
            title={title}
            active={index === step}
          />
        ))}
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.75fr]">
        <form
          className="rounded-[2rem] border p-8 shadow-2xl sm:p-10"
          style={{
            borderColor: "var(--border-strong)",
            backgroundColor: "var(--bg-secondary)",
            boxShadow: "0 32px 80px var(--shadow-color)",
          }}
          onSubmit={handleSubmit}
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p
                className="text-sm font-semibold uppercase tracking-[0.3em]"
                style={{ color: "var(--text-muted)" }}
              >
                Step {step + 1} of {steps.length}
              </p>
              <h2
                className="mt-2 text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {steps[step]}
              </h2>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                Complete the required fields to create the account and send the
                password setup email.
              </p>
            </div>
            <div
              className="rounded-full border px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: "var(--border-soft)",
                backgroundColor: "var(--bg-panel)",
                color: "var(--text-primary)",
              }}
            >
              {Math.round(((step + 1) / steps.length) * 100)}%
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {step === 0 && (
              <>
                <FormInput label="Name of client" name="clientName" value={formValues.clientName} onChange={handleChange} placeholder="John Doe" required />
                <FormInput label="Project name" name="projectName" value={formValues.projectName} onChange={handleChange} placeholder="OrbitDesk Portal" required />
                <FormInput label="Username" name="username" value={formValues.username} onChange={handleChange} placeholder="john.doe" required />
                <FormInput label="Email" name="email" type="email" value={formValues.email} onChange={handleChange} placeholder="john@example.com" required />
              </>
            )}

            {step === 1 && (
              <>
                <FormInput label="Company name" name="companyName" value={formValues.companyName} onChange={handleChange} placeholder="Acme Technologies" required />
                <FormInput label="Company location" name="companyLocation" value={formValues.companyLocation} onChange={handleChange} placeholder="Bengaluru, India" required />
                <div className="md:col-span-2">
                  <FormInput label="Company website" name="companyWebsite" type="url" value={formValues.companyWebsite} onChange={handleChange} placeholder="https://example.com" required />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="md:col-span-2">
                  <FileUploadField label="Signed agreement copy" name="signedAgreementCopy" file={files.signedAgreementCopy} onChange={handleFileChange} accept="application/pdf" helperText="Only PDF files are allowed." required />
                </div>
                <div className="md:col-span-2">
                  <FileUploadField label="Government ID" name="govId" file={files.govId} onChange={handleFileChange} accept="application/pdf,image/*" helperText="PDF or image files are allowed." required />
                </div>
              </>
            )}
          </div>

          {error ? (
            <p
              className="mt-5 rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: "var(--border-strong)",
                backgroundColor: "var(--bg-soft)",
                color: "var(--text-primary)",
              }}
            >
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 0 || submitting}
              className="rounded-full border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: "var(--border-soft)",
                backgroundColor: "var(--bg-panel)",
                color: "var(--text-primary)",
              }}
            >
              Back
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-full px-5 py-3 text-sm font-semibold text-white transition"
                style={{
                  background: "linear-gradient(135deg, #5b4dff 0%, #2f6bff 100%)",
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #5b4dff 0%, #2f6bff 100%)",
                }}
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            )}
          </div>
        </form>

        <div className="grid gap-6">
          <SectionCard
            title="Email invitation"
            text="As soon as the account is created, the server sends an email with a secure set-password link."
          />
          <SectionCard
            title="OTP login"
            text="After setting the password, the client logs in with username or email plus password, then confirms with an OTP sent to the same email."
          />
          <SectionCard
            title="Cloud uploads"
            text="Signup still stores both uploaded files in Cloudinary and saves the URLs in MongoDB."
          />
        </div>
      </section>
    </>
  );
}

export default SignupPage;
