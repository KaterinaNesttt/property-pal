import { FormEvent, useMemo, useState } from "react";
import { addMonths } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import TenantForm, { TenantFormValues } from "@/components/TenantForm";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import { Property, Tenant } from "@/lib/types";

const copy = {
  createTaskTitlePrefix: "Оплата оренди: ",
  createTaskDescription: "Автоматично створене нагадування після додавання орендаря.",
  saved: "Орендаря оновлено",
  created: "Орендаря створено",
  newTenant: "Новий орендар",
  description:
    "Орендарі прив'язані до об'єктів. Після створення автоматично додається нагадування про оплату через місяць.",
  title: "Орендарі",
  loading: "Завантаження орендарів...",
  error: "Не вдалося отримати орендарів або список об'єктів.",
  noProperty: "Без об'єкта",
  active: "Активний",
  inactive: "Неактивний",
  empty: "Орендарів ще немає.",
};

const today = new Date().toISOString().slice(0, 10);

const initialForm: TenantFormValues = {
  id: "",
  property_id: "",
  full_name: "",
  phone: "",
  lease_start: today,
  monthly_rent: "",
  notes: "",
};

const Tenants = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TenantFormValues>(initialForm);
  const [open, setOpen] = useState(false);

  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.get<Property[]>("/api/properties", token),
  });
  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get<Tenant[]>("/api/tenants", token),
  });

  const mutation = useMutation({
    mutationFn: async (payload: TenantFormValues) => {
      const leaseStart = payload.lease_start || today;
      const reminderDate = addMonths(new Date(`${leaseStart}T09:00:00`), 1);
      const tenantBody = {
        ...payload,
        lease_start: leaseStart,
        lease_end: leaseStart,
        monthly_rent: Number(payload.monthly_rent || 0),
      };

      const response = await (payload.id
        ? api.put<{ id: string }>(`/api/tenants/${payload.id}`, tenantBody, token)
        : api.post<{ id: string }>("/api/tenants", tenantBody, token));

      if (!payload.id) {
        await api.post(
          "/api/tasks",
          {
            property_id: payload.property_id,
            tenant_id: response.id,
            title: `${copy.createTaskTitlePrefix}${payload.full_name}`,
            description: copy.createTaskDescription,
            priority: "medium",
            status: "open",
            due_date: reminderDate.toISOString().slice(0, 10),
            reminder_at: reminderDate.toISOString(),
          },
          token,
        );
      }

      return response;
    },
    onSuccess: async (_, payload) => {
      toast.success(payload.id ? copy.saved : copy.created);
      setDraft(initialForm);
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Для цього об'єкта вже є активний орендар");
        return;
      }
      toast.error("Не вдалося зберегти орендаря");
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(draft);
  };

  const availableProperties = useMemo(
    () =>
      (propertiesQuery.data ?? []).filter(
        (property) => property.status !== "rented" || property.id === draft.property_id,
      ),
    [draft.property_id, propertiesQuery.data],
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          actions={
            <button
              className="glass-button bg-btns/15 text-white"
              onClick={() => {
                setDraft(initialForm);
                setOpen(true);
              }}
              type="button"
            >
              <UserPlus className="mr-2 inline h-4 w-4" />
              {copy.newTenant}
            </button>
          }
          description={copy.description}
          title={copy.title}
        />

        {tenantsQuery.isLoading || propertiesQuery.isLoading ? <LoadingBlock label={copy.loading} /> : null}
        {tenantsQuery.error || propertiesQuery.error ? <ErrorBlock label={copy.error} /> : null}

        <section className="grid gap-4 md:grid-cols-2">
          {(tenantsQuery.data ?? []).map((tenant) => (
            <Link
              key={tenant.id}
              className="glass-card flex cursor-pointer flex-col gap-5 transition hover:-translate-y-0.5 hover:bg-white/5"
              to={`/tenants/${tenant.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{tenant.full_name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{tenant.property_name ?? copy.noProperty}</p>
                </div>
                <StatusBadge label={tenant.is_active ? copy.active : copy.inactive} value={tenant.is_active ? "active" : "inactive"} />
              </div>
              <div className="grid gap-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span>{tenant.phone}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Дата заїзду</p>
                    <p className="mt-2 font-medium text-white">{formatDate(tenant.lease_start)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Місячна оренда</p>
                    <p className="mt-2 font-medium text-white">{money(tenant.monthly_rent)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {!tenantsQuery.isLoading && (tenantsQuery.data ?? []).length === 0 ? <EmptyBlock label={copy.empty} /> : null}
        </section>

        <Dialog onOpenChange={setOpen} open={open}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-gradient text-white">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Редагування орендаря" : "Новий орендар"}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Вкажіть об'єкт, контактні дані та дату початку оренди.
              </DialogDescription>
            </DialogHeader>
            <TenantForm
              availableProperties={availableProperties}
              draft={draft}
              isPending={mutation.isPending}
              onChange={setDraft}
              onReset={() => setDraft(initialForm)}
              onSubmit={submit}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Tenants;
