import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Flame, Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import { Meter, MeterType, Property } from "@/lib/types";

const initialForm = {
  id: "",
  property_id: "",
  meter_type: "water" as MeterType,
  unit: "м³",
  previous_reading: 0,
  current_reading: 0,
  tariff: 0,
  reading_date: new Date().toISOString().slice(0, 10),
  note: "",
};

const icons = {
  water: Droplets,
  gas: Flame,
  electricity: Zap,
};

const Meters = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialForm);

  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.get<Property[]>("/api/properties", token),
  });
  const metersQuery = useQuery({
    queryKey: ["meters"],
    queryFn: () => api.get<Meter[]>("/api/meters", token),
  });

  const mutation = useMutation({
    mutationFn: (payload: typeof initialForm) => {
      const body = {
        ...payload,
        previous_reading: Number(payload.previous_reading),
        current_reading: Number(payload.current_reading),
        tariff: Number(payload.tariff),
      };
      return payload.id ? api.put(`/api/meters/${payload.id}`, body, token) : api.post("/api/meters", body, token);
    },
    onSuccess: () => {
      toast.success("Показники збережено");
      setDraft(initialForm);
      queryClient.invalidateQueries({ queryKey: ["meters"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/meters/${id}`, token),
    onSuccess: () => {
      toast.success("Показники видалено");
      queryClient.invalidateQueries({ queryKey: ["meters"] });
    },
  });

  const computed = useMemo(() => {
    const diff = Math.max(0, Number(draft.current_reading) - Number(draft.previous_reading));
    return { diff, total: diff * Number(draft.tariff) };
  }, [draft]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(draft);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader description="Внесення показників і автоматичний розрахунок комунальної складової." title="Лічильники" />

        {metersQuery.isLoading || propertiesQuery.isLoading ? <LoadingBlock label="Завантаження лічильників..." /> : null}
        {metersQuery.error || propertiesQuery.error ? <ErrorBlock label="Не вдалося отримати лічильники або об'єкти." /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="grid gap-4 md:grid-cols-2">
            {(metersQuery.data ?? []).map((meter) => {
              const Icon = icons[meter.meter_type];
              const usage = Math.max(0, meter.current_reading - meter.previous_reading);
              const total = usage * meter.tariff;
              return (
                <article key={meter.id} className="glass-card space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="glass-icon h-11 w-11">
                        <Icon className="h-5 w-5 text-cyan-200" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{meter.property_name ?? "Без об'єкта"}</h2>
                        <p className="text-sm text-slate-400">{meter.meter_type}</p>
                      </div>
                    </div>
                    <p className="text-right text-sm text-slate-300">{formatDate(meter.reading_date)}</p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Було</p>
                      <p className="mt-2 text-lg text-white">{meter.previous_reading}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Стало</p>
                      <p className="mt-2 text-lg text-white">{meter.current_reading}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Спожито</p>
                      <p className="mt-2 text-lg text-white">
                        {usage} {meter.unit}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                    Сума до нарахування: {money(total)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="glass-button flex-1"
                      onClick={() =>
                        setDraft({
                          id: meter.id,
                          property_id: meter.property_id,
                          meter_type: meter.meter_type,
                          unit: meter.unit,
                          previous_reading: meter.previous_reading,
                          current_reading: meter.current_reading,
                          tariff: meter.tariff,
                          reading_date: meter.reading_date,
                          note: meter.note ?? "",
                        })
                      }
                      type="button"
                    >
                      <Pencil className="mr-2 inline h-4 w-4" />
                      Редагувати
                    </button>
                    <button className="glass-button text-rose-200" onClick={() => deleteMutation.mutate(meter.id)} type="button">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
            {!metersQuery.isLoading && (metersQuery.data ?? []).length === 0 ? <EmptyBlock label="Лічильників ще немає." /> : null}
          </section>

          <section className="glass-card">
            <h2 className="text-xl font-semibold text-white">{draft.id ? "Редагування лічильника" : "Новий показник"}</h2>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, property_id: event.target.value }))} required value={draft.property_id}>
                <option value="">Оберіть об'єкт</option>
                {(propertiesQuery.data ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-4 md:grid-cols-2">
                <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, meter_type: event.target.value as MeterType }))} value={draft.meter_type}>
                  <option value="water">Вода</option>
                  <option value="gas">Газ</option>
                  <option value="electricity">Електрика</option>
                </select>
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} required value={draft.unit} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" min={0} onChange={(event) => setDraft((current) => ({ ...current, previous_reading: Number(event.target.value) }))} required type="number" value={draft.previous_reading} />
                <input className="glass-input" min={0} onChange={(event) => setDraft((current) => ({ ...current, current_reading: Number(event.target.value) }))} required type="number" value={draft.current_reading} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" min={0} onChange={(event) => setDraft((current) => ({ ...current, tariff: Number(event.target.value) }))} required step="0.01" type="number" value={draft.tariff} />
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, reading_date: event.target.value }))} required type="date" value={draft.reading_date} />
              </div>
              <textarea className="glass-input min-h-[120px]" onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Нотатка" value={draft.note} />
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Споживання: {computed.diff} {draft.unit}. Нарахування: {money(computed.total)}
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

export default Meters;
