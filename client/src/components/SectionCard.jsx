function SectionCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 backdrop-blur">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

export default SectionCard;
