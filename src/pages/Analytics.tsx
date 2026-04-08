import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, TrendingDown, TrendingUp } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, monthKey } from "@/lib/format";
import { Meter, Payment, Property } from "@/lib/types";

const Analytics = () => {
  const { token } = useAuth();
  const propertiesQuery = useQuery({ queryKey: ["properties"], queryFn: () => api.get<Property[]>("/api/properties", token) });
  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: () => api.get<Payment[]>("/api/payments", token) });
  const metersQuery = useQuery({ queryKey: ["meters"], queryFn: () => api.get<Meter[]>("/api/meters", token) });

  const data = useMemo(() => {
    const payments = paymentsQuery.data ?? [];
    const meters = metersQuery.data ?? [];

    const monthly = Array.from(
      payments.reduce((map, payment) => {
        const key = monthKey(payment.period_month);
        const current = map.get(key) ?? { month: key, income: 0, outstanding: 0 };
        if (payment.status === "paid") {
          current.income += payment.total_amount;
        } else {
          current.outstanding += payment.total_amount;
        }
        map.set(key, current);
        return map;
      }, new Map<string, { month: string; income: number; outstanding: number }>()),
    )
      .map(([, value]) => value)
      .sort((left, right) => left.month.localeCompare(right.month));

    const utilityCost = meters.reduce((sum, meter) => sum + Math.max(0, meter.current_reading - meter.previous_reading) * meter.tariff, 0);

    return { monthly, utilityCost };
  }, [metersQuery.data, paymentsQuery.data]);

  if (propertiesQuery.isLoading || paymentsQuery.isLoading || metersQuery.isLoading) {
    return (
      <AppLayout>
        <LoadingBlock label="Завантаження аналітики…" />
      </AppLayout>
    );
  }

  if (propertiesQuery.error || paymentsQuery.error || metersQuery.error) {
    return (
      <AppLayout>
        <ErrorBlock label="Не вдалося зібрати аналітику." />
      </AppLayout>
    );
  }

  const maxColumn = Math.max(1, ...data.monthly.map((item) => Math.max(item.income, item.outstanding)));

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader description="Фінансова аналітика по об'єктах і орендарях." title="Аналітика" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={TrendingUp} label="Оплачено" tone="success" value={money((paymentsQuery.data ?? []).filter((item) => item.status === "paid").reduce((sum, item) => sum + item.total_amount, 0))} />
          <StatCard icon={TrendingDown} label="Борг" tone="danger" value={money((paymentsQuery.data ?? []).filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.total_amount, 0))} />
          <StatCard icon={BarChart3} label="Комунальні" tone="warning" value={money(data.utilityCost)} />
          <StatCard icon={Building2} label="Об'єкти" value={String((propertiesQuery.data ?? []).length)} />
        </div>

        <section className="glass-card">
          <h2 className="text-xl font-semibold text-white">Динаміка по місяцях</h2>
          <div className="mt-6 grid min-h-[280px] grid-cols-1 gap-6 md:grid-cols-2">
            {data.monthly.map((item) => (
              <div key={item.month} className="rounded-3xl border border-black/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{item.month}</h3>
                  <span className="text-sm text-slate-400">Звітний місяць</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                      <span>Оплачено</span>
                      <span>{money(item.income)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5">
                      <div className="h-3 rounded-full bg-emerald-400/70" style={{ width: `${(item.income / maxColumn) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                      <span>Борг</span>
                      <span>{money(item.outstanding)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5">
                      <div className="h-3 rounded-full bg-rose-400/70" style={{ width: `${(item.outstanding / maxColumn) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Analytics;
