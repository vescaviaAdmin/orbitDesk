function SectionCard({ title, text }) {
  return (
    <div
      className="rounded-[1.5rem] border p-6 backdrop-blur"
      style={{
        borderColor: "var(--border-soft)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        {text}
      </p>
    </div>
  );
}

export default SectionCard;
