import { AlertTriangle, Building2, CreditCard, ListTodo, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import PaymentRow from "@/components/PaymentRow";
import PropertyCard from "@/components/PropertyCard";
import StatCard from "@/components/StatCard";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Payment, Property, Task, Tenant } from "@/lib/types";
import { useReminders } from "@/hooks/use-reminders";

const Dashboard = () => {
  const { token, user } = useAuth();
  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.get<Property[]>("/api/properties", token),
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<Payment[]>("/api/payments", token),
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks", token),
  });
  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get<Tenant[]>("/api/tenants", token),
  });

  useReminders(tasksQuery.data ?? [], paymentsQuery.data ?? []);

  const loading =
    propertiesQuery.isLoading || paymentsQuery.isLoading || tasksQuery.isLoading || tenantsQuery.isLoading;
  const error = propertiesQuery.error || paymentsQuery.error || tasksQuery.error || tenantsQuery.error;

  if (loading) {
    return (
      <AppLayout>
        <LoadingBlock label="Завантаження dashboard..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorBlock label="Не вдалося отримати дані для dashboard." />
      </AppLayout>
    );
  }

  const properties = propertiesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const tenants = tenantsQuery.data ?? [];

  const outstanding = payments.filter((payment) => payment.status !== "paid");
  const overduePayments = payments.filter((payment) => payment.status === "overdue");
  const monthlyIncome = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.total_amount, 0);
  const occupancy = properties.length
    ? Math.round((properties.filter((property) => property.status === "rented").length / properties.length) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          description={`Роль: ${user?.role}. Дані зчитуються напряму з API та D1.`}
          title={`Вітаю, ${user?.full_name}`}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={Wallet} label="Оплачено" tone="success" value={money(monthlyIncome)} />
          <StatCard
            icon={CreditCard}
            label="Очікує"
            tone="warning"
            value={money(outstanding.reduce((sum, item) => sum + item.total_amount, 0))}
          />
          <StatCard icon={AlertTriangle} label="Прострочено" tone="danger" value={String(overduePayments.length)} />
          <StatCard icon={Building2} label="Об'єкти" value={String(properties.length)} />
          <StatCard
            icon={ListTodo}
            label="Відкриті задачі"
            value={String(tasks.filter((task) => task.status !== "done").length)}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Останні оплати</h2>
              <span className="text-sm text-slate-400">Записів: {payments.length}</span>
            </div>
            <div className="space-y-3">
              {payments.slice(0, 5).map((payment) => (
                <PaymentRow key={payment.id} onDelete={() => undefined} onEdit={() => undefined} payment={payment} showActions={false} />
              ))}
              {payments.length === 0 ? <EmptyBlock label="Оплат ще немає." /> : null}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Активні об'єкти</h2>
              <span className="text-sm text-slate-400">Заповненість {occupancy}%</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {properties.slice(0, 4).map((property) => (
                <PropertyCard key={property.id} onDelete={() => undefined} onEdit={() => undefined} property={property} showActions={false} />
              ))}
            </div>
            {properties.length === 0 ? <EmptyBlock label="Об'єкти ще не додані." /> : null}
          </section>
        </div>

        <section className="glass-card">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Орендарі</p>
              <p className="mt-3 text-2xl font-semibold text-white">{tenants.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Прострочені задачі</p>
              <p className="mt-3 text-2xl font-semibold text-white">{tasks.filter((task) => task.status === "overdue").length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Лічильники потребують внесення</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {properties.filter((property) => property.status !== "maintenance").length}
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
