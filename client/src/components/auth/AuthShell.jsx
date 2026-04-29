function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ef_0%,#f7f7f2_46%,#f4f1e8_100%)] text-[#17201c]">
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-8 lg:px-8">
        <section className="w-full rounded-[1.75rem] border border-[#d8ddd6] bg-white p-5 shadow-xl shadow-[#17201c]/10 sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}

export default AuthShell;
