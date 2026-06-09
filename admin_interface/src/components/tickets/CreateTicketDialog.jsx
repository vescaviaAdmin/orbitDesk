import { useEffect, useState } from "react";

const initialErrors = {};

function CreateTicketDialog({
  initialValues = null,
  loading,
  members,
  onClose,
  onSubmit,
  open,
  projectName,
  showStatusField = false,
  submitLabel = "Create ticket",
  titleLabel = "Create Ticket",
}) {
  function buildFormState() {
    return {
      title: initialValues?.title || "",
      description: initialValues?.description || "",
      priority: initialValues?.priority || "medium",
      type: initialValues?.type || "task",
      status: initialValues?.status || "open",
      assignedTo: initialValues?.assignedTo || members?.[0]?._id || "",
      deadline: initialValues?.deadline ? String(initialValues.deadline).split("T")[0] : "",
      urlsText: initialValues?.urlsText || "",
    };
  }

  const [form, setForm] = useState({
    ...buildFormState(),
  });
  const [errors, setErrors] = useState(initialErrors);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(buildFormState());
    setErrors(initialErrors);
  }, [initialValues, members, open]);

  if (!open) {
    return null;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {
      title: form.title.trim() ? "" : "Ticket title is required.",
      assignedTo: form.assignedTo ? "" : "Select an assignee.",
      deadline: form.deadline ? "" : "Due date is required.",
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      urlsText: form.urlsText.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/25 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-2xl rounded-xl border border-blue-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="eyebrow">{titleLabel}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{projectName}</h3>
            <p className="muted-text mt-2 text-sm">Raise a ticket with clear ownership, priority, and context.</p>
          </div>
          <button aria-label="Close create ticket dialog" className="secondary-button px-3 py-2" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="grid gap-4 p-6" onSubmit={handleSubmit}>
          <Field error={errors.title} label="Ticket title">
            <input className="input-field mt-2" name="title" onChange={handleChange} placeholder="Payment webhook fails on retry" value={form.title} />
          </Field>

          <Field label="Description">
            <textarea className="input-field mt-2 min-h-28" name="description" onChange={handleChange} placeholder="Add the issue context, expected behavior, and any useful reproduction notes." value={form.description} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            {showStatusField ? (
              <Field label="Status">
                <select className="input-field mt-2" name="status" onChange={handleChange} value={form.status}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancel">Cancel</option>
                </select>
              </Field>
            ) : null}
            <Field label="Priority">
              <select className="input-field mt-2" name="priority" onChange={handleChange} value={form.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select className="input-field mt-2" name="type" onChange={handleChange} value={form.type}>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
                <option value="improvement">Improvement</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={errors.assignedTo} label="Assignee">
              <select className="input-field mt-2" name="assignedTo" onChange={handleChange} value={form.assignedTo}>
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </Field>

            <Field error={errors.deadline} label="Due date">
              <input className="input-field mt-2" name="deadline" onChange={handleChange} type="date" value={form.deadline} />
            </Field>
          </div>

          <Field label="Reference links">
            <textarea className="input-field mt-2 min-h-24" name="urlsText" onChange={handleChange} placeholder="One link per line" value={form.urlsText} />
          </Field>

          <div className="flex items-center justify-end gap-3">
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button min-w-32" disabled={loading} type="submit">
              {loading ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
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

export default CreateTicketDialog;
