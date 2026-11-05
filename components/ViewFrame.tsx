export default function ViewFrame({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
      <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest">{title}</span>
        <span className="text-xs text-muted">{count} pieces</span>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </div>
  );
}
