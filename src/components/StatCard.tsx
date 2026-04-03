import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  children?: ReactNode;
}

const StatCard = ({ icon: Icon, label, value, trend, trendUp }: StatCardProps) => {
  return (
    <div className="glass-card p-3 sm:p-5 animate-slide-up group hover:scale-[1.02] transition-transform duration-300 overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="stat-value text-xl sm:text-2xl">{value}</p>
          {trend && (
            <p className={`text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
