import { Icon } from '@/components/ui/Icon';

export default function CollapsibleRow({
  open,
  onToggle,
  color,
  title,
  subtitle,
  count,
  disabled,
  indent,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  color: string;
  title: string;
  subtitle?: string;
  count: number;
  disabled?: boolean;
  indent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 py-3.5 pr-5 text-left transition-colors hover:bg-surface/70 disabled:opacity-40 ${indent ? 'pl-9' : 'pl-5'}`}
      >
        <span
          aria-hidden="true"
          className={`shrink-0 rounded-full ${indent ? 'h-2 w-2' : 'h-7 w-1'}`}
          style={{ backgroundColor: color }}
        />
        <span className="min-w-0 flex-1">
          <span className={`block truncate ${indent ? 'text-sm' : 'text-sm font-semibold'}`}>
            {title}
          </span>
          {subtitle && <span className="block truncate text-xs text-faint">{subtitle}</span>}
        </span>
        <span className="shrink-0 text-xs text-muted">
          {count} {count === 1 ? 'piece' : 'pieces'}
        </span>
        {!disabled && (
          <Icon
            name="chevron-down"
            size={14}
            className={`shrink-0 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {open && <div className="border-t border-line/60 bg-surface animate-fade-in">{children}</div>}
    </div>
  );
}
