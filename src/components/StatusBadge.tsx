import { PaymentStatus, PropertyStatus, TaskPriority, TaskStatus } from "@/lib/types";

type Variant = PropertyStatus | PaymentStatus | TaskStatus | TaskPriority | "active" | "inactive";

const classes: Record<Variant, string> = {
  free: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  rented: "bg-sky-500/15 text-sky-300 border-sky-400/20",
  maintenance: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  pending: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  overdue: "bg-rose-500/15 text-rose-300 border-rose-400/20",
  open: "bg-sky-500/15 text-sky-300 border-sky-400/20",
  in_progress: "bg-violet-500/15 text-violet-300 border-violet-400/20",
  done: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  low: "bg-slate-500/15 text-slate-300 border-slate-400/20",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  high: "bg-rose-500/15 text-rose-300 border-rose-400/20",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  inactive: "bg-slate-500/15 text-slate-300 border-slate-400/20",
};

const StatusBadge = ({ value, label }: { value: Variant; label?: string }) => {
  return (
    <span className={`glass-button text-center font-semibold ${classes[value]}`}>
      {label ?? value}
    </span>
  );
};

export default StatusBadge;
