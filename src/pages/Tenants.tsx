import { FormEvent, useMemo, useState } from "react";
import { addMonths } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { useAuth } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import { Property, Tenant } from "@/lib/types";

const copy = {
  createTaskTitlePrefix: "\u041e\u043f\u043b\u0430\u0442\u0430 \u043e\u0440\u0435\u043d\u0434\u0438: ",
  createTaskDescription:
    "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u0435 \u043d\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043d\u043d\u044f \u043f\u0456\u0441\u043b\u044f \u0434\u043e\u0434\u0430\u0432\u0430\u043d\u043d\u044f \u043e\u0440\u0435\u043d\u0434\u0430\u0440\u044f.",
  saved: "\u041e\u0440\u0435\u043d\u0434\u0430\u0440\u044f \u043e\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
  created: "\u041e\u0440\u0435\u043d\u0434\u0430\u0440\u044f \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043e",
  deleted: "\u041e\u0440\u0435\u043d\u0434\u0430\u0440\u044f \u0432\u0438\u0434\u0430\u043b\u0435\u043d\u043e",
  newTenant: "\u041d\u043e\u0432\u0438\u0439 \u043e\u0440\u0435\u043d\u0434\u0430\u0440",
  description:
    "\u041e\u0440\u0435\u043d\u0434\u0430\u0440\u0456 \u043f\u0440\u0438\u0432'\u044f\u0437\u0430\u043d\u0456 \u0434\u043e \u043e\u0431'\u0454\u043a\u0442\u0456\u0432. \u041f\u0456\u0441\u043b\u044f \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e \u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u043d\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043d\u043d\u044f \u043f\u0440\u043e \u043e\u043f\u043b\u0430\u0442\u0443 \u0447\u0435\u0440\u0435\u0437 \u043c\u0456\u0441\u044f\u0446\u044c.",
  title: "\u041e\u0440\u0435\u043d\u0434\u0430\u0440\u0456",
  loading: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u043e\u0440\u0435\u043d\u0434\u0430\u0440\u0456\u0432...",
  error: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u043e\u0440\u0435\u043d\u0434\u0430\u0440\u0456\u0432 \u0430\u0431\u043e \u0441\u043f\u0438\u0441\u043e\u043a \u043e\u0431'\u0454\u043a\u0442\u0456\u0432.",
  noProperty: "\u0411\u0435\u0437 \u043e\u0431'\u0454\u043a\u0442\u0430",
  active: "\u0410\u043a\u0442\u0438\u0432\u043d\u0438\u0439",
  inactive: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u0438\u0439",
  moveIn: "\u0414\u0430\u0442\u0430 \u0437\u0430\u0457\u0437\u0434\u0443: ",
  monthlyRent: "\u041c\u0456\u0441\u044f\u0447\u043d\u0430 \u043e\u0440\u0435\u043d\u0434\u0430: ",
  edit: "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438",
  empty: "\u041e\u0440\u0435\u043d\u0434\u0430\u0440\u0456\u0432 \u0449\u0435 \u043d\u0435\u043c\u0430\u0454.",
  editTitle: "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u043d\u043d\u044f \u043e\u0440\u0435\u043d\u0434\u0430\u0440\u044f",
  createTitle: "\u041d\u043e\u0432\u0438\u0439 \u043e\u0440\u0435\u043d\u0434\u0430\u0440",
  selectProperty: "\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043e\u0431'\u0454\u043a\u0442",
  fullName: "\u041f\u0406\u0411",
  phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
  moveInPlaceholder: "\u0414\u0430\u0442\u0430 \u0437\u0430\u0457\u0437\u0434\u0443",
  rentPlaceholder: "\u0421\u0443\u043c\u0430 \u043e\u0440\u0435\u043d\u0434\u043d\u043e\u0457 \u043f\u043b\u0430\u0442\u0438",
  notes: "\u041d\u043e\u0442\u0430\u0442\u043a\u0438",
  autoReminder:
    "\u041f\u0456\u0441\u043b\u044f \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u043d\u044f \u043e\u0440\u0435\u043d\u0434\u0430\u0440\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e \u0434\u043e\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u043d\u0430\u0433\u0430\u0434\u0443\u0432\u0430\u043d\u043d\u044f \u043f\u0440\u043e \u043e\u043f\u043b\u0430\u0442\u0443 \u0440\u0456\u0432\u043d\u043e \u0447\u0435\u0440\u0435\u0437 \u043c\u0456\u0441\u044f\u0446\u044c.",
  saving: "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043d\u044f...",
  update: "\u041e\u043d\u043e\u0432\u0438\u0442\u0438",
  create: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438",
  reset: "\u0421\u043a\u0438\u043d\u0443\u0442\u0438",
};

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  id: "",
  property_id: "",
  full_name: "",
  email: "",
  phone: "",
  lease_start: today,
  monthly_rent: "",
  notes: "",
};

const Tenants = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialForm);

  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.get<Property[]>("/api/properties", token),
  });
  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get<Tenant[]>("/api/tenants", token),
  });

  const mutation = useMutation({
    mutationFn: async (payload: typeof initialForm) => {
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/tenants/${id}`, token),
    onSuccess: () => {
      toast.success(copy.deleted);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
            <button className="glass-button bg-cyan-400/15 text-white" onClick={() => setDraft(initialForm)} type="button">
              <UserPlus className="mr-2 inline h-4 w-4" />
              {copy.newTenant}
            </button>
          }
          description={copy.description}
          title={copy.title}
        />

        {tenantsQuery.isLoading || propertiesQuery.isLoading ? <LoadingBlock label={copy.loading} /> : null}
        {tenantsQuery.error || propertiesQuery.error ? <ErrorBlock label={copy.error} /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="grid gap-4 md:grid-cols-2">
            {(tenantsQuery.data ?? []).map((tenant) => (
              <article key={tenant.id} className="glass-card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link className="text-lg font-semibold text-white transition hover:text-cyan-200" to={`/tenants/${tenant.id}`}>
                      {tenant.full_name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-400">{tenant.property_name ?? copy.noProperty}</p>
                  </div>
                  <StatusBadge label={tenant.is_active ? copy.active : copy.inactive} value={tenant.is_active ? "active" : "inactive"} />
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>{tenant.email}</p>
                  <p>{tenant.phone}</p>
                  <p>{copy.moveIn}{formatDate(tenant.lease_start)}</p>
                  <p>{copy.monthlyRent}{money(tenant.monthly_rent)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="glass-button flex-1"
                    onClick={() =>
                      setDraft({
                        id: tenant.id,
                        property_id: tenant.property_id,
                        full_name: tenant.full_name,
                        email: tenant.email,
                        phone: tenant.phone,
                        lease_start: tenant.lease_start,
                        monthly_rent: String(tenant.monthly_rent),
                        notes: tenant.notes ?? "",
                      })
                    }
                    type="button"
                  >
                    <Pencil className="mr-2 inline h-4 w-4" />
                    {copy.edit}
                  </button>
                  <button className="glass-button text-rose-200" onClick={() => deleteMutation.mutate(tenant.id)} type="button">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
            {!tenantsQuery.isLoading && (tenantsQuery.data ?? []).length === 0 ? <EmptyBlock label={copy.empty} /> : null}
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-semibold text-white">{draft.id ? copy.editTitle : copy.createTitle}</h2>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, property_id: event.target.value }))} required value={draft.property_id}>
                <option value="">{copy.selectProperty}</option>
                {availableProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} {property.status === "rented" ? "(зайнятий)" : ""}
                  </option>
                ))}
              </select>
              <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))} placeholder={copy.fullName} required value={draft.full_name} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" required type="email" value={draft.email} />
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder={copy.phone} required value={draft.phone} />
              </div>
              <input
                className="glass-input"
                onChange={(event) => setDraft((current) => ({ ...current, lease_start: event.target.value }))}
                placeholder={copy.moveInPlaceholder}
                required
                type="date"
                value={draft.lease_start}
              />
              <input
                className="glass-input"
                min={0}
                onChange={(event) => setDraft((current) => ({ ...current, monthly_rent: event.target.value }))}
                placeholder={copy.rentPlaceholder}
                required
                type="number"
                value={draft.monthly_rent}
              />
              <textarea className="glass-input min-h-[120px]" onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder={copy.notes} value={draft.notes} />
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">{copy.autoReminder}</div>
              <div className="flex gap-3">
                <button className="glass-button flex-1 justify-center bg-cyan-400/15 text-white" disabled={mutation.isPending} type="submit">
                  {mutation.isPending ? copy.saving : draft.id ? copy.update : copy.create}
                </button>
                <button className="glass-button" onClick={() => setDraft(initialForm)} type="button">
                  {copy.reset}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default Tenants;
