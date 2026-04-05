import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const toneMap = {
  default: "from-cyan-500/15 to-sky-500/5 text-cyan-200",
  success: "from-emerald-500/15 to-emerald-500/5 text-emerald-200",
  warning: "from-amber-500/15 to-amber-500/5 text-amber-200",
  danger: "from-rose-500/15 to-rose-500/5 text-rose-200",
};

const StatCard = ({ icon: Icon, label, value, tone = "default", className }: StatCardProps) => {
  return (
    <div className={cn("glass-card bg-gradient-to-br", toneMap[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className="glass-icon h-11 w-11">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
