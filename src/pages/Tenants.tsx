import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import { Property, Tenant } from "@/lib/types";

const initialForm = {
  id: "",
  property_id: "",
  full_name: "",
  email: "",
  phone: "",
  lease_start: "",
  lease_end: "",
  monthly_rent: 0,
  notes: "",
  access_password: "",
};

const Tenants = () => {
  const { token, user } = useAuth();
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
    mutationFn: (payload: typeof initialForm) => {
      const body = {
        ...payload,
        access_password: payload.access_password || undefined,
        monthly_rent: Number(payload.monthly_rent),
      };

      return payload.id
        ? api.put<Tenant>(`/api/tenants/${payload.id}`, body, token)
        : api.post<Tenant>("/api/tenants", body, token);
    },
    onSuccess: () => {
      toast.success("Орендаря збережено");
      setDraft(initialForm);
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/tenants/${id}`, token),
    onSuccess: () => {
      toast.success("Орендаря видалено");
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(draft);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          actions={
            <button className="glass-button bg-cyan-400/15 text-white" onClick={() => setDraft(initialForm)} type="button">
              <UserPlus className="mr-2 inline h-4 w-4" />
              Новий орендар
            </button>
          }
          description="Орендарі прив'язані до об'єктів. За потреби одразу створюється доступ tenant."
          title="Орендарі"
        />

        {tenantsQuery.isLoading || propertiesQuery.isLoading ? <LoadingBlock label="Завантаження орендарів…" /> : null}
        {tenantsQuery.error || propertiesQuery.error ? <ErrorBlock label="Не вдалося отримати орендарів або список об'єктів." /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="grid gap-4 md:grid-cols-2">
            {(tenantsQuery.data ?? []).map((tenant) => (
              <article key={tenant.id} className="glass-card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{tenant.full_name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{tenant.property_name ?? "Без об'єкта"}</p>
                  </div>
                  <StatusBadge label={tenant.is_active ? "Активний" : "Неактивний"} value={tenant.is_active ? "active" : "inactive"} />
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>{tenant.email}</p>
                  <p>{tenant.phone}</p>
                  <p>Договір: {formatDate(tenant.lease_start)} → {formatDate(tenant.lease_end)}</p>
                  <p>Місячна оренда: {money(tenant.monthly_rent)}</p>
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
                        lease_end: tenant.lease_end,
                        monthly_rent: tenant.monthly_rent,
                        notes: tenant.notes ?? "",
                        access_password: "",
                      })
                    }
                    type="button"
                  >
                    <Pencil className="mr-2 inline h-4 w-4" />
                    Редагувати
                  </button>
                  <button className="glass-button text-rose-200" onClick={() => deleteMutation.mutate(tenant.id)} type="button">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
            {!tenantsQuery.isLoading && (tenantsQuery.data ?? []).length === 0 ? <EmptyBlock label="Орендарів ще немає." /> : null}
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-semibold text-white">{draft.id ? "Редагування орендаря" : "Новий орендар"}</h2>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, property_id: event.target.value }))} required value={draft.property_id}>
                <option value="">Оберіть об'єкт</option>
                {(propertiesQuery.data ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))} placeholder="ПІБ" required value={draft.full_name} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" required type="email" value={draft.email} />
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Телефон" required value={draft.phone} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, lease_start: event.target.value }))} required type="date" value={draft.lease_start} />
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, lease_end: event.target.value }))} required type="date" value={draft.lease_end} />
              </div>
              <input className="glass-input" min={0} onChange={(event) => setDraft((current) => ({ ...current, monthly_rent: Number(event.target.value) }))} required type="number" value={draft.monthly_rent} />
              {!draft.id && user?.role !== "tenant" ? (
                <input
                  className="glass-input"
                  minLength={6}
                  onChange={(event) => setDraft((current) => ({ ...current, access_password: event.target.value }))}
                  placeholder="Пароль для tenant-доступу (необов'язково)"
                  type="password"
                  value={draft.access_password}
                />
              ) : null}
              <textarea className="glass-input min-h-[120px]" onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Нотатки" value={draft.notes} />
              <div className="flex gap-3">
                <button className="glass-button flex-1 justify-center bg-cyan-400/15 text-white" disabled={mutation.isPending} type="submit">
                  {mutation.isPending ? "Збереження…" : draft.id ? "Оновити" : "Створити"}
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

export default Tenants;
