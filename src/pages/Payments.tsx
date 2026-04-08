import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import PaymentRow from "@/components/PaymentRow";
import StatCard from "@/components/StatCard";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import IosDrumPicker from "@/components/ui/ios-date-picker";
import IosMonthPicker from "@/components/ui/ios-month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Payment, PaymentStatus, PaymentType, Property, Tenant } from "@/lib/types";

const initialForm = {
  id: "",
  property_id: "",
  tenant_id: "",
  payment_type: "rent" as PaymentType,
  period_month: new Date().toISOString().slice(0, 7),
  base_amount: 0,
  utilities_amount: 0,
  due_date: new Date().toISOString().slice(0, 10),
  paid_at: "",
  note: "",
};

const paymentTypeOptions: Array<{ value: PaymentType; label: string }> = [
  { value: "rent", label: "Оренда" },
  { value: "utilities", label: "Комунальні" },
  { value: "internet", label: "Інтернет" },
  { value: "other", label: "Інше" },
];

const Payments = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [draft, setDraft] = useState(initialForm);

  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.get<Property[]>("/api/properties", token),
  });
  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get<Tenant[]>("/api/tenants", token),
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<Payment[]>("/api/payments", token),
  });
  const today = new Date().toISOString().slice(0, 10);
  const payments = useMemo(
    () =>
      (paymentsQuery.data ?? []).map((payment) => ({
        ...payment,
        status: payment.status === "pending" && payment.due_date < today ? "overdue" : payment.status,
      })),
    [paymentsQuery.data, today],
  );

  const mutation = useMutation({
    mutationFn: (payload: typeof initialForm) => {
      const body = {
        ...payload,
        tenant_id: payload.tenant_id || null,
        paid_at: payload.paid_at || null,
        base_amount: Number(payload.base_amount),
        utilities_amount: Number(payload.utilities_amount),
      };
      return payload.id ? api.put(`/api/payments/${payload.id}`, body, token) : api.post("/api/payments", body, token);
    },
    onSuccess: () => {
      toast.success("Платіж збережено");
      setDraft(initialForm);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/payments/${id}`, token),
    onSuccess: () => {
      toast.success("Платіж видалено");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => (statusFilter === "all" ? true : payment.status === statusFilter));
  }, [payments, statusFilter]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(draft);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          actions={
            <button className="glass-button bg-btns/15 text-white" onClick={() => setDraft(initialForm)} type="button">
              <Plus className="mr-2 inline h-4 w-4" />
              Новий платіж
            </button>
          }
          description="Переглядай, фільтруй і керуй оплатами по об'єктах."
          title="Оплати"
        />

        {paymentsQuery.isLoading || propertiesQuery.isLoading || tenantsQuery.isLoading ? <LoadingBlock label="Завантаження оплат..." /> : null}
        {paymentsQuery.error || propertiesQuery.error || tenantsQuery.error ? <ErrorBlock label="Не вдалося отримати платежі або зв'язані сутності." /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Plus} label="Очікує" tone="warning" value={money(payments.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.total_amount, 0))} />
          <StatCard icon={Plus} label="Оплачено" tone="success" value={money(payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.total_amount, 0))} />
          <StatCard icon={Plus} label="Прострочено" tone="danger" value={money(payments.filter((item) => item.status === "overdue").reduce((sum, item) => sum + item.total_amount, 0))} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Усі" },
                { key: "pending", label: "Очікують" },
                { key: "paid", label: "Оплачені" },
                { key: "overdue", label: "Прострочені" },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`glass-button ${statusFilter === item.key ? "bg-btns/15 text-white" : ""}`}
                  onClick={() => setStatusFilter(item.key as "all" | PaymentStatus)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredPayments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  onDelete={(item) => deleteMutation.mutate(item.id)}
                  onEdit={(item) =>
                    setDraft({
                      id: item.id,
                      property_id: item.property_id,
                      tenant_id: item.tenant_id ?? "",
                      payment_type: item.payment_type,
                      period_month: item.period_month,
                      base_amount: item.base_amount,
                      utilities_amount: item.utilities_amount,
                      due_date: item.due_date,
                      paid_at: item.paid_at ?? "",
                      note: item.note ?? "",
                    })
                  }
                  payment={payment}
                />
              ))}
              {!paymentsQuery.isLoading && filteredPayments.length === 0 ? <EmptyBlock label="Платежів за цим фільтром немає." /> : null}
            </div>
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-semibold text-white">{draft.id ? "Редагування платежу" : "Новий платіж"}</h2>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <Select onValueChange={(value) => setDraft((current) => ({ ...current, property_id: value, tenant_id: "" }))} value={draft.property_id}>
                <SelectTrigger className="glass-input h-auto border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-xl">
                  <SelectValue placeholder="Оберіть об'єкт" />
                </SelectTrigger>
                <SelectContent>
                  {(propertiesQuery.data ?? []).map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => setDraft((current) => ({ ...current, tenant_id: value === "__none__" ? "" : value }))} value={draft.tenant_id || "__none__"}>
                <SelectTrigger className="glass-input h-auto border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-xl">
                  <SelectValue placeholder="Без орендаря" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без орендаря</SelectItem>
                  {(tenantsQuery.data ?? [])
                    .filter((tenant) => !draft.property_id || tenant.property_id === draft.property_id)
                    .map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="grid gap-4 md:grid-cols-2">
                <Select onValueChange={(value) => setDraft((current) => ({ ...current, payment_type: value as PaymentType }))} value={draft.payment_type}>
                  <SelectTrigger className="glass-input h-auto border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-xl">
                    <SelectValue placeholder="Тип платежу" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <IosMonthPicker onChange={(value) => setDraft((current) => ({ ...current, period_month: value }))} value={draft.period_month} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" min={0} onChange={(event) => setDraft((current) => ({ ...current, base_amount: Number(event.target.value) }))} required type="number" value={draft.base_amount} />
                <input className="glass-input" min={0} onChange={(event) => setDraft((current) => ({ ...current, utilities_amount: Number(event.target.value) }))} required type="number" value={draft.utilities_amount} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <IosDrumPicker onChange={(value) => setDraft((current) => ({ ...current, due_date: value }))} placeholder="Оберіть дату" value={draft.due_date} />
                <IosDrumPicker onChange={(value) => setDraft((current) => ({ ...current, paid_at: value }))} placeholder="Дата оплати" value={draft.paid_at} />
              </div>
              <textarea className="glass-input min-h-[120px]" onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Нотатка" value={draft.note} />
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Підсумок: {money(Number(draft.base_amount) + Number(draft.utilities_amount))}
              </div>
              <div className="flex gap-3">
                <button className="glass-button flex-1 justify-center bg-btns/15 text-white" disabled={mutation.isPending} type="submit">
                  {mutation.isPending ? "Збереження..." : draft.id ? "Оновити" : "Створити"}
                </button>
                <button className="glass-button" onClick={() => setDraft(initialForm)} type="button">
                  Скинути
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default Payments;
