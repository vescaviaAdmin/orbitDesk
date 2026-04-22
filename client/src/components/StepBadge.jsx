function StepBadge({ step, title, active }) {
  return (
    <div
      className="rounded-[1.5rem] border px-4 py-4 transition"
      style={{
        borderColor: active ? "var(--border-strong)" : "var(--border-soft)",
        backgroundColor: active ? "var(--bg-soft)" : "var(--bg-secondary)",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--text-muted)" }}>
        Step {step}
      </p>
      <p className="mt-1 text-sm font-medium">{title}</p>
    </div>
  );
}

export default StepBadge;
