function Hero({ apiMessage }) {
  return (
    <section className="rounded-3xl border border-brand-500/20 bg-slate-900/70 p-8 shadow-2xl shadow-brand-950/20">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-brand-100">
        React + Tailwind starter
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Build your OrbitDesk frontend with a clean, simple structure.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
        This client is ready for pages, reusable components, API calls, and
        Tailwind styling.
      </p>

      <div className="mt-8 inline-flex rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-50">
        API status: {apiMessage}
      </div>
    </section>
  );
}

export default Hero;
