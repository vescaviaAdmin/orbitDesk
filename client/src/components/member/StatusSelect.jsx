import { getStatusTone } from "../../lib/member-utils";

export default function StatusSelect({ className = "", disabled, id, onChange, status }) {
  const tone = getStatusTone(status);

  return (
    <select
      className={`input-field input-field-compact input-field-status input-field-status-${tone} ${className}`.trim()}
      disabled={disabled}
      id={id}
      onChange={onChange}
      value={status}
    >
      <option value="open">Open</option>
      <option value="in_progress">In progress</option>
      <option value="done">Done</option>
      <option value="cancel">Cancel</option>
    </select>
  );
}
