import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'search',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-faint">
        <Icon name={icon} size={24} />
      </div>
      <p className="font-display text-lg text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}
