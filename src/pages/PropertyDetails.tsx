import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CreditCard, Home, Receipt, UserRound, Wrench } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import PaymentRow from "@/components/PaymentRow";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, money } from "@/lib/format";
import { Meter, Payment, Property, Task, Tenant } from "@/lib/types";

function sortByDateDesc<T>(items: T[], pick: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => new Date(pick(right) ?? 0).getTime() - new Date(pick(left) ?? 0).getTime());
}

function sortByDateAsc<T>(items: T[], pick: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => new Date(pick(left) ?? 0).getTime() - new Date(pick(right) ?? 0).getTime());
}

function formatOffset(dateValue: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const now = new Date();
  const target = new Date(`${dateValue}T00:00:00`);
  const diff = Math.ceil((target.getTime() - now.getTime()) / msPerDay);

  if (diff > 0) {
    return `через ${diff} дн.`;
  }
  if (diff < 0) {
    return `${Math.abs(diff)} дн. тому`;
  }
  return "сьогодні";
}

const PropertyDetails = () => {
  const { id = "" } = useParams();
  const { token } = useAuth();

  const propertyQuery = useQuery({
    queryKey: ["property", id],
    queryFn: () => api.get<Property>(`/api/properties/${id}`, token),
    enabled: Boolean(id && token),
  });
  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get<Tenant[]>("/api/tenants", token),
    enabled: Boolean(token),
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<Payment[]>("/api/payments", token),
    enabled: Boolean(token),
  });
  const metersQuery = useQuery({
    queryKey: ["meters"],
    queryFn: () => api.get<Meter[]>("/api/meters", token),
    enabled: Boolean(token),
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks", token),
    enabled: Boolean(token),
  });

  const derived = useMemo(() => {
    const tenants = (tenantsQuery.data ?? []).filter((tenant) => tenant.property_id === id);
    const activeTenant = tenants.find((tenant) => tenant.is_active === 1) ?? null;
    const payments = sortByDateDesc(
      (paymentsQuery.data ?? []).filter((payment) => payment.property_id === id),
      (payment) => payment.paid_at ?? payment.due_date,
    );
    const upcomingPayments = sortByDateAsc(
      payments.filter((payment) => payment.status !== "paid"),
      (payment) => payment.due_date,
    );
    const paymentHistory = payments.filter((payment) => payment.status === "paid");
    const meters = sortByDateDesc(
      (metersQuery.data ?? []).filter((meter) => meter.property_id === id),
      (meter) => meter.reading_date,
    );
    const tasks = sortByDateAsc(
      (tasksQuery.data ?? []).filter((task) => task.property_id === id),
      (task) => task.due_date,
    );
    const upcomingTasks = tasks.filter((task) => task.status === "open" || task.status === "in_progress");
    const completedTasks = tasks.filter((task) => task.status === "done");

    return {
      tenants,
      activeTenant,
      payments,
      upcomingPayments,
      paymentHistory,
      meters,
      tasks,
      upcomingTasks,
      completedTasks,
      paidTotal: payments.filter((payment) => payment.status === "paid").reduce((sum, item) => sum + item.total_amount, 0),
      pendingTotal: payments.filter((payment) => payment.status !== "paid").reduce((sum, item) => sum + item.total_amount, 0),
      utilitiesTotal: meters.reduce(
        (sum, meter) => sum + Math.max(0, meter.current_reading - meter.previous_reading) * meter.tariff,
        0,
      ),
    };
  }, [id, metersQuery.data, paymentsQuery.data, tasksQuery.data, tenantsQuery.data]);

  const isLoading =
    propertyQuery.isLoading ||
    tenantsQuery.isLoading ||
    paymentsQuery.isLoading ||
    metersQuery.isLoading ||
    tasksQuery.isLoading;
  const hasError =
    propertyQuery.error || tenantsQuery.error || paymentsQuery.error || metersQuery.error || tasksQuery.error;

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingBlock label="Завантаження сторінки об'єкта..." />
      </AppLayout>
    );
  }

  if (hasError || !propertyQuery.data) {
    return (
      <AppLayout>
        <ErrorBlock label="Не вдалося отримати дані об'єкта." />
      </AppLayout>
    );
  }

  const property = propertyQuery.data;
  const latestMeter = derived.meters[0] ?? null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title={property.name}
          description={`${property.address} • ${property.type}`}
          actions={
            <div className="flex gap-2">
              <Link className="glass-button" to="/properties">
                <ArrowLeft className="mr-2 inline h-4 w-4" />
                До списку
              </Link>
              <StatusBadge
                label={property.status === "free" ? "Вільний" : property.status === "rented" ? "Зданий" : "Обслуговування"}
                value={property.status}
              />
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Receipt} label="Місячна оренда" value={money(property.rent_amount)} />
          <StatCard icon={CreditCard} label="Сплачено" tone="success" value={money(derived.paidTotal)} />
          <StatCard icon={CalendarClock} label="Очікується" tone="warning" value={money(derived.pendingTotal)} />
          <StatCard icon={Wrench} label="Нараховано по лічильниках" tone="default" value={money(derived.utilitiesTotal)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="glass-card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Поточний стан</h2>
                {derived.activeTenant ? (
                  <Link className="glass-button" to={`/tenants/${derived.activeTenant.id}`}>
                    <UserRound className="mr-2 inline h-4 w-4" />
                    Орендар
                  </Link>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Активний орендар</p>
                  <p className="mt-2 text-lg text-white">{derived.activeTenant?.full_name ?? "Немає"}</p>
                  <p className="mt-1 text-sm text-slate-400">{derived.activeTenant?.phone ?? "Об'єкт доступний"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Найближча оплата</p>
                  <p className="mt-2 text-lg text-white">
                    {derived.upcomingPayments[0] ? money(derived.upcomingPayments[0].total_amount) : "Немає"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {derived.upcomingPayments[0]
                      ? `${formatDate(derived.upcomingPayments[0].due_date)} • ${formatOffset(derived.upcomingPayments[0].due_date)}`
                      : "Немає активних нарахувань"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Останні показники</p>
                  <p className="mt-2 text-lg text-white">{latestMeter ? formatDate(latestMeter.reading_date) : "Немає"}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {latestMeter
                      ? `${Math.max(0, latestMeter.current_reading - latestMeter.previous_reading)} ${latestMeter.unit}`
                      : "Показники ще не внесені"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Нотатки</p>
                  <p className="mt-2 text-sm text-slate-300">{property.notes || "Без нотаток"}</p>
                </div>
              </div>
            </div>

            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Оплати та історія</h2>
              <div className="space-y-3">
                {derived.payments.slice(0, 6).map((payment) => (
                  <PaymentRow key={payment.id} onDelete={() => undefined} onEdit={() => undefined} payment={payment} showActions={false} />
                ))}
                {derived.payments.length === 0 ? <EmptyBlock label="По об'єкту ще немає оплат." /> : null}
              </div>
            </div>

            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Задачі та майбутні дати</h2>
              <div className="space-y-3">
                {derived.tasks.slice(0, 8).map((task) => (
                  <article key={task.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{task.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{task.description || "Без опису"}</p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge value={task.priority} label={task.priority} />
                        <StatusBadge value={task.status} label={task.status} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>До {formatDate(task.due_date)}</span>
                      <span>{formatOffset(task.due_date)}</span>
                      <span>Нагадування {formatDateTime(task.reminder_at)}</span>
                    </div>
                  </article>
                ))}
                {derived.tasks.length === 0 ? <EmptyBlock label="По об'єкту ще немає задач." /> : null}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Орендарі</h2>
              <div className="space-y-3">
                {derived.tenants.map((tenant) => (
                  <div key={tenant.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link className="font-semibold text-white transition hover:text-cyan-200" to={`/tenants/${tenant.id}`}>
                          {tenant.full_name}
                        </Link>
                        <p className="mt-1 text-sm text-slate-400">{tenant.phone}</p>
                      </div>
                      <StatusBadge label={tenant.is_active ? "Активний" : "Неактивний"} value={tenant.is_active ? "active" : "inactive"} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>Заїзд {formatDate(tenant.lease_start)}</span>
                      <span>Завершення {formatDate(tenant.lease_end)}</span>
                      <span>{money(tenant.monthly_rent)}</span>
                    </div>
                  </div>
                ))}
                {derived.tenants.length === 0 ? <EmptyBlock label="Орендарів ще немає." /> : null}
              </div>
            </div>

            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Лічильники та розрахунки</h2>
              <div className="space-y-3">
                {derived.meters.map((meter) => {
                  const usage = Math.max(0, meter.current_reading - meter.previous_reading);
                  const total = usage * meter.tariff;
                  return (
                    <div key={meter.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{meter.meter_type}</p>
                          <p className="mt-1 text-sm text-slate-400">{formatDate(meter.reading_date)}</p>
                        </div>
                        <Home className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                        <span>Було: {meter.previous_reading}</span>
                        <span>Стало: {meter.current_reading}</span>
                        <span>Спожито: {usage} {meter.unit}</span>
                      </div>
                      <p className="mt-3 text-sm text-cyan-200">Нарахування: {money(total)}</p>
                    </div>
                  );
                })}
                {derived.meters.length === 0 ? <EmptyBlock label="Показників ще немає." /> : null}
              </div>
            </div>

            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Зведення</h2>
              <div className="space-y-3 text-sm text-slate-300">
                <p>Майбутніх оплат: {derived.upcomingPayments.length}</p>
                <p>Оплат в історії: {derived.paymentHistory.length}</p>
                <p>Активних задач: {derived.upcomingTasks.length}</p>
                <p>Завершених задач: {derived.completedTasks.length}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
};

export default PropertyDetails;
