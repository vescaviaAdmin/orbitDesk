function FileUploadField({
  label,
  name,
  onChange,
  accept,
  helperText,
  required = false,
  file,
}) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-sm font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <input
        className="w-full rounded-2xl border border-dashed px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        style={{
          borderColor: "var(--border-strong)",
          backgroundColor: "var(--bg-panel)",
          color: "var(--text-secondary)",
        }}
        name={name}
        type="file"
        accept={accept}
        onChange={onChange}
        required={required}
      />
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {helperText}
      </p>
      <p
        className="mt-1 text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {file ? `Selected: ${file.name}` : "No file selected"}
      </p>
    </label>
  );
}

export default FileUploadField;
