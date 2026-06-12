import { useMemo, useState } from "react";
import EmptyState from "../ui/EmptyState";

const categories = ["Web App", "Mobile App", "Internal Tool", "Client Portal", "API Platform", "Other"];

function ProjectOnboardingForm({
  clients,
  form,
  loading,
  memberSearch,
  members,
  onBack,
  onMemberSearch,
  onSubmit,
}) {
  const [errors, setErrors] = useState({});

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return query
      ? members.filter((member) => [member.name, member.email].some((value) => value.toLowerCase().includes(query)))
      : members;
  }, [memberSearch, members]);

  function handleChange(event) {
    const { name, value } = event.target;
    onSubmit({ type: "change", name, value });
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleMemberToggle(memberId) {
    onSubmit({ type: "toggle-member", memberId });
  }

  function handleResourceChange(index, event) {
    const { name, value } = event.target;
    onSubmit({ type: "change-resource", index, name, value });
    setErrors((current) => ({
      ...current,
      resources: (current.resources || []).map((resourceError, currentIndex) =>
        currentIndex === index ? { ...resourceError, [name]: "" } : resourceError,
      ),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const resourceErrors = (form.resources || []).map((resource) => ({
      name: resource.name.trim() ? "" : "Resource name is required.",
      url: /^https?:\/\/.+/i.test(resource.url.trim()) ? "" : "Use a valid http or https URL.",
    }));

    const nextErrors = {
      name: form.name.trim() ? "" : "Project name is required.",
      description: form.description.trim() ? "" : "Project description is required.",
      repositoryUrl:
        !form.repositoryUrl || /^https:\/\/(www\.)?github\.com\/.+/i.test(form.repositoryUrl)
          ? ""
          : "Use a valid GitHub repository URL.",
      category: form.category ? "" : "Select a project category.",
      resources: resourceErrors,
    };

    setErrors(nextErrors);
    if (
      nextErrors.name ||
      nextErrors.description ||
      nextErrors.repositoryUrl ||
      nextErrors.category ||
      resourceErrors.some((resourceError) => resourceError.name || resourceError.url)
    ) {
      return;
    }

    onSubmit({ type: "submit" });
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-center">
        <button className="secondary-button" onClick={onBack} type="button">
          Back to projects
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form className="surface-card p-6" onSubmit={handleSubmit}>
          <p className="eyebrow">Project Onboarding</p>
          <h2 className="section-title mt-3">Create a new client project</h2>
          <p className="muted-text mt-3 text-sm">
            Capture the essential delivery context now. Planning-heavy workflow details stay out of the onboarding flow.
          </p>

          <div className="mt-6 grid gap-4">
            <Field error={errors.name} label="Project name">
              <input className="input-field mt-2" name="name" onChange={handleChange} placeholder="OrbitDesk Admin Refresh" value={form.name} />
            </Field>

            <Field error={errors.description} label="Project description">
              <textarea className="input-field mt-2 min-h-32" name="description" onChange={handleChange} placeholder="Describe the product scope, business goal, and what the delivery team is building." value={form.description} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field error={errors.repositoryUrl} label="GitHub repository URL">
                <input className="input-field mt-2" name="repositoryUrl" onChange={handleChange} placeholder="https://github.com/acme/orbitdesk" value={form.repositoryUrl} />
              </Field>

              <Field error={errors.category} label="Project type">
                <select className="input-field mt-2" name="category" onChange={handleChange} value={form.category}>
                  <option value="">Select project type</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Client/company name">
                <input className="input-field mt-2" name="clientCompany" onChange={handleChange} placeholder="Acme Corp" value={form.clientCompany} />
              </Field>

              <Field label="Client email">
                <select className="input-field mt-2" name="clientEmail" onChange={handleChange} value={form.clientEmail}>
                  <option value="">Select client email</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client.email}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Project status">
              <select className="input-field mt-2" name="status" onChange={handleChange} value={form.status}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </Field>

            <div className="surface-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Project resources</p>
                  <p className="muted-text mt-1 text-sm">Attach named links the team should keep with this workspace.</p>
                </div>
                <button className="secondary-button" onClick={() => onSubmit({ type: "add-resource" })} type="button">
                  Add resource
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {(form.resources || []).map((resource, index) => {
                  const resourceError = errors.resources?.[index] || {};

                  return (
                    <div className="rounded-xl border border-slate-200 bg-white p-3" key={`resource-${index}`}>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-start">
                        <Field error={resourceError.name} label="Name">
                          <input
                            className="input-field mt-2"
                            name="name"
                            onChange={(event) => handleResourceChange(index, event)}
                            placeholder="Figma board"
                            value={resource.name}
                          />
                        </Field>

                        <Field error={resourceError.url} label="Link">
                          <input
                            className="input-field mt-2"
                            name="url"
                            onChange={(event) => handleResourceChange(index, event)}
                            placeholder="https://..."
                            value={resource.url}
                          />
                        </Field>

                        <div className="pt-0 md:pt-7">
                          <button className="secondary-button w-full md:w-auto" onClick={() => onSubmit({ type: "remove-resource", index })} type="button">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!form.resources?.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    No resource links added yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end">
            <button className="primary-button min-w-40" disabled={loading} type="submit">
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>

        <section className="surface-card p-6">
          <p className="eyebrow">Team Members</p>
          <h2 className="section-title mt-3 text-xl">Assign contributors during onboarding</h2>
          <p className="muted-text mt-3 text-sm">Select the members who should already be attached to the project workspace.</p>

          <input className="input-field mt-5" onChange={(event) => onMemberSearch(event.target.value)} placeholder="Search member by name or email" value={memberSearch} />

          <div className="mt-5 space-y-3">
            {filteredMembers.map((member) => (
              <button
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  form.memberIds.includes(member._id)
                    ? "border-[color:var(--primary)] bg-[color:var(--primary-softer)]"
                    : "border-slate-200 bg-slate-50 hover:border-[color:var(--primary)] hover:bg-[color:var(--primary-softer)]"
                }`}
                key={member._id}
                onClick={() => handleMemberToggle(member._id)}
                type="button"
              >
                <div>
                  <p className="font-semibold text-slate-900">{member.name}</p>
                  <p className="muted-text text-sm">{member.email}</p>
                </div>
                <span className={`badge ${form.memberIds.includes(member._id) ? "badge-primary" : "badge-muted"}`}>
                  {form.memberIds.includes(member._id) ? "Added" : "Add"}
                </span>
              </button>
            ))}
          </div>

          {!filteredMembers.length ? (
            <EmptyState copy="No active members match the current search." title="No members found" />
          ) : null}
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

export default ProjectOnboardingForm;
