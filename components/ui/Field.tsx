export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base sm:text-sm text-ink placeholder:text-faint transition-colors focus:border-ink focus:outline-none disabled:bg-sunken';

export function Field({
  label,
  htmlFor,
  required,
  hint,
  badge,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-accent">
            *
          </span>
        )}
        {badge}
      </label>
      {children}
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}
