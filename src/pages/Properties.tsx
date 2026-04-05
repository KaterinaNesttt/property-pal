import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import PropertyCard from "@/components/PropertyCard";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Property, PropertyStatus, Tenant } from "@/lib/types";

const initialForm = {
  id: "",
  name: "",
  address: "",
  type: "Квартира",
  status: "free" as PropertyStatus,
  rent_amount: 0,
  notes: "",
};

const Properties = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PropertyStatus>("all");
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
      const body = { ...payload, rent_amount: Number(payload.rent_amount) };
      return payload.id
        ? api.put<Property>(`/api/properties/${payload.id}`, body, token)
        : api.post<Property>("/api/properties", body, token);
    },
    onSuccess: () => {
      toast.success("Об'єкт збережено");
      setDraft(initialForm);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/properties/${id}`, token),
    onSuccess: () => {
      toast.success("Об'єкт видалено");
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const items = useMemo(() => {
    return (propertiesQuery.data ?? []).filter((property) => {
      const matchesSearch =
        property.name.toLowerCase().includes(search.toLowerCase()) ||
        property.address.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "all" ? true : property.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [propertiesQuery.data, search, status]);

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
              <Plus className="mr-2 inline h-4 w-4" />
              Новий об'єкт
            </button>
          }
          description="CRUD для нерухомості, статусів та прив'язок до орендарів."
          title="Нерухомість"
        />

        {propertiesQuery.isLoading || tenantsQuery.isLoading ? <LoadingBlock label="Завантаження об'єктів..." /> : null}
        {propertiesQuery.error || tenantsQuery.error ? <ErrorBlock label="Не вдалося отримати об'єкти або орендарів." /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="glass-input pl-10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Пошук за назвою або адресою"
                  value={search}
                />
              </label>
              <select className="glass-input max-w-xs" onChange={(event) => setStatus(event.target.value as "all" | PropertyStatus)} value={status}>
                <option value="all">Усі статуси</option>
                <option value="free">Вільний</option>
                <option value="rented">Зданий</option>
                <option value="maintenance">Обслуговування</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {items.map((property) => (
                <PropertyCard
                  key={property.id}
                  onDelete={(item) => deleteMutation.mutate(item.id)}
                  onEdit={(item) =>
                    setDraft({
                      id: item.id,
                      name: item.name,
                      address: item.address,
                      type: item.type,
                      status: item.status,
                      rent_amount: item.rent_amount,
                      notes: item.notes ?? "",
                    })
                  }
                  property={property}
                />
              ))}
            </div>
            {!propertiesQuery.isLoading && items.length === 0 ? <EmptyBlock label="Під поточні фільтри нічого не знайдено." /> : null}
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-semibold text-white">{draft.id ? "Редагування об'єкта" : "Новий об'єкт"}</h2>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Назва" required value={draft.name} />
              <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} placeholder="Адреса" required value={draft.address} />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Тип" required value={draft.type} />
                <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as PropertyStatus }))} value={draft.status}>
                  <option value="free">Вільний</option>
                  <option value="rented">Зданий</option>
                  <option value="maintenance">Обслуговування</option>
                </select>
              </div>
              <input
                className="glass-input"
                min={0}
                onChange={(event) => setDraft((current) => ({ ...current, rent_amount: Number(event.target.value) }))}
                placeholder="Місячна оренда"
                required
                type="number"
                value={draft.rent_amount}
              />
              <textarea className="glass-input min-h-[120px]" onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Нотатки" value={draft.notes} />
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Активних орендарів: {(tenantsQuery.data ?? []).filter((tenant) => tenant.is_active === 1).length}. Поточна роль: {user?.role}.
              </div>
              <div className="flex gap-3">
                <button className="glass-button flex-1 justify-center bg-cyan-400/15 text-white" disabled={mutation.isPending} type="submit">
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

export default Properties;
