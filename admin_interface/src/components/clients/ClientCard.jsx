import { StatusBadge } from "../ui/Badges";
import { formatDate } from "../../lib/utils";

function ClientCard({ client }) {
  return (
    <article className="surface-card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{client.name}</h3>
          <p className="muted-text text-sm">{client.email}</p>
        </div>
        <StatusBadge status={client.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoTile label="Company" value={client.company || "-"} />
        <InfoTile label="Phone" value={client.phone || "-"} />
        <InfoTile label="Invited" value={formatDate(client.onboardedAt || client.createdAt)} />
        <InfoTile label="Password setup" value={formatDate(client.passwordSetAt)} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={`badge ${client.agreementDocument?.url ? "badge-success" : "badge-muted"}`}>
          {client.agreementDocument?.url ? "Agreement uploaded" : "Agreement pending"}
        </span>
        {client.agreementDocument?.url ? (
          <a className="secondary-button px-3 py-2" href={client.agreementDocument.url} rel="noreferrer" target="_blank">
            View agreement
          </a>
        ) : null}
      </div>
    </article>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default ClientCard;
