import { TrendingUp, TrendingDown, DollarSign, Building2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";

const monthlyData = [
  { month: "Січ", income: 38000, expenses: 8500 },
  { month: "Лют", income: 40000, expenses: 7200 },
  { month: "Бер", income: 37800, expenses: 12100 },
  { month: "Кві", income: 42350, expenses: 6800 },
];

const propertyROI = [
  { name: "Хрещатик, 10", income: 15000, expenses: 3200, roi: 12.4 },
  { name: "Шевченка, 22", income: 10000, expenses: 2100, roi: 9.8 },
  { name: "Сагайдачного, 3", income: 18000, expenses: 4500, roi: 15.2 },
];

const Analytics = () => {
  const maxIncome = Math.max(...monthlyData.map(d => d.income));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Аналітика</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Загальний дохід" value="158 150 ₴" trend="за 4 міс" trendUp />
          <StatCard icon={TrendingDown} label="Витрати" value="34 600 ₴" />
          <StatCard icon={DollarSign} label="Чистий прибуток" value="123 550 ₴" trend="+8%" trendUp />
          <StatCard icon={Building2} label="Середній ROI" value="12.5%" trendUp />
        </div>

        {/* Chart substitute */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-lg font-semibold text-foreground mb-6">Дохід за місяцями</h2>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-primary/30 transition-all duration-500 hover:bg-primary/50"
                    style={{
                      height: `${(d.income / maxIncome) * 160}px`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                  <div
                    className="w-full rounded-t-lg bg-destructive/25"
                    style={{ height: `${(d.expenses / maxIncome) * 160}px` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary/30" />
              <span>Дохід</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-destructive/25" />
              <span>Витрати</span>
            </div>
          </div>
        </div>

        {/* ROI per property */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-lg font-semibold text-foreground mb-4">ROI по об'єктах</h2>
          <div className="space-y-4">
            {propertyROI.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-sm font-bold text-primary">{p.roi}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-700"
                      style={{ width: `${(p.roi / 20) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Analytics;
