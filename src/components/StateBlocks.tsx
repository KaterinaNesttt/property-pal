export const LoadingBlock = ({ label = "Завантаження…" }: { label?: string }) => (
  <div className="glass-card text-sm text-slate-200">{label}</div>
);

export const ErrorBlock = ({ label }: { label: string }) => (
  <div className="glass-card border border-rose-400/20 text-sm text-rose-200">{label}</div>
);

export const EmptyBlock = ({ label }: { label: string }) => (
  <div className="glass-card text-sm text-slate-300">{label}</div>
);
