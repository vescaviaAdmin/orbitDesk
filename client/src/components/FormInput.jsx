function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
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
        className="w-full rounded-2xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-brand-500/30"
        style={{
          borderColor: "var(--border-soft)",
          backgroundColor: "var(--bg-panel)",
          color: "var(--text-primary)",
        }}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export default FormInput;
