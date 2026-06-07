export default function TableSection({ children, subtitle, title }) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="muted-text mt-2 text-sm">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
