import { getStatusTone, normalizeStatus } from "../../lib/member-utils";

export default function StatusBadge({ status }) {
  const tone = getStatusTone(status);
  const className =
    tone === "completed"
      ? "badge badge-success"
      : tone === "assigned"
        ? "badge badge-info"
        : tone === "pending"
          ? "badge badge-warning"
          : "badge badge-muted";

  return (
    <span className={className}>
      <span aria-hidden="true" className={`status-dot status-dot-${tone === "neutral" ? "neutral" : tone}`} />
      {normalizeStatus(status)}
    </span>
  );
}
