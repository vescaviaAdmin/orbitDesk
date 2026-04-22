function SignupSuccess({ submission }) {
  return (
    <section
      className="rounded-[2rem] border p-8 shadow-2xl"
      style={{
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "0 32px 80px var(--shadow-color)",
      }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--text-muted)" }}>
        Signup completed
      </p>
      <h2 className="mt-4 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Client account created successfully.
      </h2>
      <p className="mt-4 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
        The account has been saved in MongoDB and both uploaded documents were
        uploaded to Cloudinary successfully.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div
          className="rounded-[1.5rem] border p-5"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
            Client ID
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>
            {submission.clientId}
          </p>
        </div>
        <div
          className="rounded-[1.5rem] border p-5"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
            Saved email
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>
            {submission.email}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div
          className="rounded-[1.5rem] border p-5"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
            Agreement URL
          </p>
          <p className="mt-2 break-all text-sm" style={{ color: "var(--text-primary)" }}>
            {submission.signedAgreementCopyUrl}
          </p>
        </div>
        <div
          className="rounded-[1.5rem] border p-5"
          style={{
            borderColor: "var(--border-soft)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
            Gov ID URL
          </p>
          <p className="mt-2 break-all text-sm" style={{ color: "var(--text-primary)" }}>
            {submission.govIdUrl}
          </p>
        </div>
      </div>

      <div
        className="mt-4 rounded-[1.5rem] border p-5"
        style={{
          borderColor: "var(--border-soft)",
          backgroundColor: "var(--bg-panel)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
          Password Setup Link
        </p>
        <p className="mt-2 break-all text-sm" style={{ color: "var(--text-primary)" }}>
          {submission.setupLink}
        </p>
      </div>
    </section>
  );
}

export default SignupSuccess;
