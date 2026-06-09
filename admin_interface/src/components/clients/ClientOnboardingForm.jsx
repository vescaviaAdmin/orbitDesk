import { useMemo, useState } from "react";
import EmptyState from "../ui/EmptyState";
import { StatusBadge } from "../ui/Badges";
import { formatDate } from "../../lib/utils";

function ClientOnboardingForm({ clients, form, loading, onBack, onChange, onSubmit }) {
  const [errors, setErrors] = useState({});

  const recentClients = useMemo(() => clients.slice(0, 4), [clients]);

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {
      name: form.name.trim() ? "" : "Client name is required.",
      email: /\S+@\S+\.\S+/.test(form.email) ? "" : "Use a valid client email.",
      agreement: form.agreement ? "" : "Upload the client agreement file.",
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    onSubmit();
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-center">
        <button className="secondary-button" onClick={onBack} type="button">
          Back to clients
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="surface-card p-6" onSubmit={handleSubmit}>
          <p className="eyebrow">Client Onboarding</p>
          <h2 className="section-title mt-3">Create a client workspace profile</h2>
          <p className="muted-text mt-3 text-sm">
            Keep onboarding concise: identity, company context, contact information, and the signed agreement.
          </p>

          <div className="mt-6 grid gap-4">
            <Field error={errors.name} label="Client name">
              <input className="input-field mt-2" name="name" onChange={onChange} placeholder="Aarav Shah" value={form.name} />
            </Field>

            <Field error={errors.email} label="Work email">
              <input className="input-field mt-2" name="email" onChange={onChange} placeholder="aarav@acme.com" type="email" value={form.email} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company name">
                <input className="input-field mt-2" name="company" onChange={onChange} placeholder="Acme Corp" value={form.company} />
              </Field>

              <Field label="Phone number">
                <input className="input-field mt-2" name="phone" onChange={onChange} placeholder="+1 415 555 0199" value={form.phone} />
              </Field>
            </div>

            <Field error={errors.agreement} label="Client agreement">
              <label className="mt-2 flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-violet-300 hover:bg-violet-50/40">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{form.agreement?.name || "Upload signed agreement"}</p>
                  <p className="mt-1 text-sm text-slate-500">PDF or supporting file required for client onboarding.</p>
                </div>
                <span className="badge badge-primary">Choose file</span>
                <input className="sr-only" name="agreement" onChange={onChange} type="file" />
              </label>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-end">
            <button className="primary-button min-w-40" disabled={loading} type="submit">
              {loading ? "Creating..." : "Create client"}
            </button>
          </div>
        </form>

        <section className="space-y-6">
          <article className="surface-card p-6">
            <p className="eyebrow">Onboarding Notes</p>
            <h3 className="section-title mt-3 text-xl">Recommended client record quality</h3>
            <div className="mt-5 space-y-3">
              {[
                "Use the stakeholder's real work email to keep password setup smooth.",
                "Attach the latest signed agreement so delivery context stays centralized.",
                "Keep company names consistent with project onboarding for cleaner reporting.",
              ].map((item) => (
                <div className="surface-muted p-4 text-sm text-slate-700" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Recent Clients</p>
                <h3 className="section-title mt-3 text-xl">Latest onboarded stakeholders</h3>
              </div>
              <span className="glass-chip">{clients.length} total</span>
            </div>

            <div className="mt-5 space-y-3">
              {recentClients.map((client) => (
                <div className="surface-muted flex items-start justify-between gap-3 p-4" key={client._id}>
                  <div>
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <p className="muted-text mt-1 text-sm">{client.company || client.email}</p>
                    <p className="muted-text mt-2 text-xs">Created {formatDate(client.createdAt)}</p>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
              ))}
              {!recentClients.length ? <EmptyState copy="No clients onboarded yet." title="No recent clients" /> : null}
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}

function Field({ children, error, label }) {
  return (
    <label className="block text-sm font-semibold text-slate-900">
      {label}
      {children}
      {error ? <span className="mt-2 block text-sm font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

export default ClientOnboardingForm;
