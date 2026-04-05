import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CreditCard, Pencil, ReceiptText, Trash2, UserRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import PaymentRow from "@/components/PaymentRow";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import TenantForm, { TenantFormValues } from "@/components/TenantForm";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime, money } from "@/lib/format";
import { Payment, Property, Task, Tenant } from "@/lib/types";

function sortByDateDesc<T>(items: T[], pick: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => new Date(pick(right) ?? 0).getTime() - new Date(pick(left) ?? 0).getTime());
}

function sortByDateAsc<T>(items: T[], pick: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => new Date(pick(left) ?? 0).getTime() - new Date(pick(right) ?? 0).getTime());
}

function leaseState(endDate: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.ceil((new Date(`${endDate}T00:00:00`).getTime() - Date.now()) / msPerDay);
  if (diff > 0) return `ще ${diff} дн.`;
  if (diff < 0) return `прострочено на ${Math.abs(diff)} дн.`;
  return "завершується сьогодні";
}

const toFormValues = (tenant: Tenant): TenantFormValues => ({
  id: tenant.id,
  property_id: tenant.property_id,
  full_name: tenant.full_name,
  phone: tenant.phone,
  lease_start: tenant.lease_start,
  monthly_rent: String(tenant.monthly_rent),
  notes: tenant.notes ?? "",
});

const TenantDetails = () => {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState<TenantFormValues | null>(null);

  const tenantQuery = useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      try {
        return await api.get<Tenant>(`/api/tenants/${id}`, token);
      } catch (error) {
        if (error instanceof Error && "status" in error && Number(error.status) === 405) {
          const tenants = await api.get<Tenant[]>("/api/tenants", token);
          const tenant = tenants.find((item) => item.id === id);
          if (tenant) {
            return tenant;
          }
        }
        throw error;
      }
    },
    enabled: Boolean(id && token),
  });
  const propertiesQuery = useQuery({ queryKey: ["properties"], queryFn: () => api.get<Property[]>("/api/properties", token), enabled: Boolean(token) });
  const paymentsQuery = useQuery({ queryKey: ["payments"], queryFn: () => api.get<Payment[]>("/api/payments", token), enabled: Boolean(token) });
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<Task[]>("/api/tasks", token), enabled: Boolean(token) });

  const updateMutation = useMutation({
    mutationFn: (payload: TenantFormValues) => api.put(`/api/tenants/${id}`, { ...payload, lease_end: payload.lease_start, monthly_rent: Number(payload.monthly_rent || 0) }, token),
    onSuccess: async () => {
      toast.success("Орендаря оновлено");
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenant", id] }),
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<void>(`/api/tenants/${id}`, token),
    onSuccess: async () => {
      toast.success("Орендаря видалено");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      navigate("/tenants");
    },
  });

  const isLoading = tenantQuery.isLoading || propertiesQuery.isLoading || paymentsQuery.isLoading || tasksQuery.isLoading;
  const hasError = tenantQuery.error || propertiesQuery.error || paymentsQuery.error || tasksQuery.error;

  const derived = useMemo(() => {
    const tenant = tenantQuery.data;
    const property = (propertiesQuery.data ?? []).find((item) => item.id === tenant?.property_id) ?? null;
    const payments = sortByDateDesc((paymentsQuery.data ?? []).filter((payment) => payment.tenant_id === tenant?.id), (payment) => payment.paid_at ?? payment.due_date);
    const upcomingPayments = sortByDateAsc(payments.filter((payment) => payment.status !== "paid"), (payment) => payment.due_date);
    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const tasks = sortByDateAsc((tasksQuery.data ?? []).filter((task) => task.tenant_id === tenant?.id), (task) => task.due_date);
    return { property, payments, upcomingPayments, paidPayments, tasks, totalPaid: paidPayments.reduce((sum, item) => sum + item.total_amount, 0), totalOpen: upcomingPayments.reduce((sum, item) => sum + item.total_amount, 0) };
  }, [paymentsQuery.data, propertiesQuery.data, tasksQuery.data, tenantQuery.data]);

  if (isLoading) return <AppLayout><LoadingBlock label="Завантаження сторінки орендаря..." /></AppLayout>;
  if (hasError || !tenantQuery.data) return <AppLayout><ErrorBlock label="Не вдалося отримати дані орендаря." /></AppLayout>;

  const tenant = tenantQuery.data;
  const availableProperties = (propertiesQuery.data ?? []).filter((property) => property.status !== "rented" || property.id === (draft?.property_id ?? tenant.property_id));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft) updateMutation.mutate(draft);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title={tenant.full_name}
          description={tenant.phone}
          actions={<div className="flex flex-wrap gap-2">
            <Link className="glass-button" to="/tenants"><ArrowLeft className="mr-2 inline h-4 w-4" />До списку</Link>
            <button className="glass-button" onClick={() => { setDraft(toFormValues(tenant)); setOpen(true); }} type="button"><Pencil className="mr-2 inline h-4 w-4" />Редагувати</button>
            <button className="glass-button text-rose-200" onClick={() => setDeleteOpen(true)} type="button"><Trash2 className="mr-2 inline h-4 w-4" />Видалити</button>
            <StatusBadge label={tenant.is_active ? "Активний" : "Неактивний"} value={tenant.is_active ? "active" : "inactive"} />
          </div>}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={CreditCard} label="Місячна оренда" value={money(tenant.monthly_rent)} />
          <StatCard icon={ReceiptText} label="Сплачено" tone="success" value={money(derived.totalPaid)} />
          <StatCard icon={CalendarDays} label="Очікується" tone="warning" value={money(derived.totalOpen)} />
          <StatCard icon={UserRound} label="Статус договору" tone={tenant.is_active ? "default" : "danger"} value={leaseState(tenant.lease_end)} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Основна інформація</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Об'єкт</p>
                  {derived.property ? <><Link className="mt-2 block text-lg text-white transition hover:text-btns" to={`/properties/${derived.property.id}`}>{derived.property.name}</Link><p className="mt-1 text-sm text-slate-400">{derived.property.address}</p></> : <p className="mt-2 text-lg text-white">Об'єкт не знайдено</p>}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Договір</p><p className="mt-2 text-lg text-white">{formatDate(tenant.lease_start)} - {formatDate(tenant.lease_end)}</p><p className="mt-1 text-sm text-slate-400">{leaseState(tenant.lease_end)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Найближча оплата</p><p className="mt-2 text-lg text-white">{derived.upcomingPayments[0] ? money(derived.upcomingPayments[0].total_amount) : "Немає"}</p><p className="mt-1 text-sm text-slate-400">{derived.upcomingPayments[0] ? formatDate(derived.upcomingPayments[0].due_date) : "Активних оплат немає"}</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Нотатки</p><p className="mt-2 text-sm text-slate-300">{tenant.notes || "Без нотаток"}</p></div>
              </div>
            </div>

            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Оплати</h2>
              <div className="space-y-3">
                {derived.payments.map((payment) => <PaymentRow key={payment.id} onDelete={() => undefined} onEdit={() => undefined} payment={payment} showActions={false} />)}
                {derived.payments.length === 0 ? <EmptyBlock label="По орендарю ще немає оплат." /> : null}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold text-white">Задачі та нагадування</h2>
              <div className="space-y-3">
                {derived.tasks.map((task) => <div key={task.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{task.title}</p><p className="mt-1 text-sm text-slate-400">{task.description || "Без опису"}</p></div><div className="flex gap-2"><StatusBadge value={task.priority} label={task.priority} /><StatusBadge value={task.status} label={task.status} /></div></div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400"><span>До {formatDate(task.due_date)}</span><span>Нагадування {formatDateTime(task.reminder_at)}</span></div>
                </div>)}
                {derived.tasks.length === 0 ? <EmptyBlock label="Активностей по орендарю ще немає." /> : null}
              </div>
            </div>

            <div className="glass-card space-y-4"><h2 className="text-xl font-semibold text-white">Ключові дати</h2><div className="space-y-3 text-sm text-slate-300"><p>Створено {formatDateTime(tenant.created_at)}</p><p>Оновлено {formatDateTime(tenant.updated_at)}</p><p>Дата заїзду {formatDate(tenant.lease_start)}</p><p>Дата завершення {formatDate(tenant.lease_end)}</p></div></div>
            <div className="glass-card space-y-4"><h2 className="text-xl font-semibold text-white">Контекст об'єкта</h2><div className="space-y-3 text-sm text-slate-300"><p>Об'єкт {derived.property?.name ?? "Невідомо"}</p><p>Адреса {derived.property?.address ?? "Невідомо"}</p><p>Статус об'єкта {derived.property?.status ?? "Невідомо"}</p><p>Базова ставка {money(derived.property?.rent_amount ?? 0)}</p></div></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Усього оплат</p><p className="mt-3 text-2xl font-semibold text-white">{derived.payments.length}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Закриті оплати</p><p className="mt-3 text-2xl font-semibold text-white">{derived.paidPayments.length}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Майбутні оплати</p><p className="mt-3 text-2xl font-semibold text-white">{derived.upcomingPayments.length}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Задачі</p><p className="mt-3 text-2xl font-semibold text-white">{derived.tasks.length}</p></div>
            </div>
          </aside>
        </div>

        <Dialog onOpenChange={setOpen} open={open}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#050816] text-white">
            <DialogHeader><DialogTitle>Редагування орендаря</DialogTitle><DialogDescription className="text-slate-400">Оновіть прив'язку до об'єкта, контакти та дату початку оренди.</DialogDescription></DialogHeader>
            {draft ? <TenantForm availableProperties={availableProperties} draft={draft} isPending={updateMutation.isPending} onChange={setDraft} onReset={() => setDraft(toFormValues(tenant))} onSubmit={submit} /> : null}
          </DialogContent>
        </Dialog>

        <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
          <AlertDialogContent className="border-white/10 bg-[#050816] text-white">
            <AlertDialogHeader><AlertDialogTitle>Видалити орендаря?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Дію неможливо скасувати. Запис орендаря буде видалено без можливості відновлення.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/5">Скасувати</AlertDialogCancel>
              <AlertDialogAction className="bg-rose-500 text-white hover:bg-rose-600" onClick={() => deleteMutation.mutate()}>Видалити</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default TenantDetails;
