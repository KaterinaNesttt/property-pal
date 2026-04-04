import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { Property, Task, TaskPriority, TaskStatus, Tenant } from "@/lib/types";

const initialForm = {
  id: "",
  property_id: "",
  tenant_id: "",
  title: "",
  description: "",
  priority: "medium" as TaskPriority,
  status: "open" as TaskStatus,
  due_date: new Date().toISOString().slice(0, 10),
  reminder_at: "",
};

const Tasks = () => {
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
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks", token),
  });

  const grouped = useMemo(
    () => ({
      open: (tasksQuery.data ?? []).filter((task) => task.status === "open" || task.status === "in_progress"),
      done: (tasksQuery.data ?? []).filter((task) => task.status === "done"),
      overdue: (tasksQuery.data ?? []).filter((task) => task.status === "overdue"),
    }),
    [tasksQuery.data],
  );

  const mutation = useMutation({
    mutationFn: (payload: typeof initialForm) => {
      const body = {
        ...payload,
        tenant_id: payload.tenant_id || null,
        reminder_at: payload.reminder_at ? new Date(payload.reminder_at).toISOString() : null,
      };
      return payload.id ? api.put(`/api/tasks/${payload.id}`, body, token) : api.post("/api/tasks", body, token);
    },
    onSuccess: () => {
      toast.success("Задачу збережено");
      setDraft(initialForm);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/tasks/${id}`, token),
    onSuccess: () => {
      toast.success("Задачу видалено");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(draft);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader description="Локальні нагадування спрацьовують через браузерні Notification API." title="Задачі" />

        {tasksQuery.isLoading || propertiesQuery.isLoading || tenantsQuery.isLoading ? <LoadingBlock label="Завантаження задач…" /> : null}
        {tasksQuery.error || propertiesQuery.error || tenantsQuery.error ? <ErrorBlock label="Не вдалося отримати задачі або зв'язані сутності." /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-4">
            {(["open", "overdue", "done"] as const).map((groupKey) => (
              <div key={groupKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold capitalize text-white">
                    {groupKey === "open" ? "Активні" : groupKey === "overdue" ? "Прострочені" : "Завершені"}
                  </h2>
                  <span className="text-sm text-slate-400">{grouped[groupKey].length}</span>
                </div>
                {grouped[groupKey].map((task) => (
                  <article key={task.id} className="glass-card space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {task.property_name ?? "Без об'єкта"} · {task.tenant_name ?? "Без орендаря"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge label={task.priority} value={task.priority} />
                        <StatusBadge label={task.status} value={task.status} />
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{task.description || "Без опису"}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>До {task.due_date}</span>
                      <span>Нагадати {formatDateTime(task.reminder_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="glass-button flex-1"
                        onClick={() =>
                          setDraft({
                            id: task.id,
                            property_id: task.property_id,
                            tenant_id: task.tenant_id ?? "",
                            title: task.title,
                            description: task.description ?? "",
                            priority: task.priority,
                            status: task.status,
                            due_date: task.due_date,
                            reminder_at: task.reminder_at ? task.reminder_at.slice(0, 16) : "",
                          })
                        }
                        type="button"
                      >
                        <Pencil className="mr-2 inline h-4 w-4" />
                        Редагувати
                      </button>
                      <button
                        className="glass-button text-emerald-200"
                        onClick={() =>
                          mutation.mutate({
                            id: task.id,
                            property_id: task.property_id,
                            tenant_id: task.tenant_id ?? "",
                            title: task.title,
                            description: task.description ?? "",
                            priority: task.priority,
                            status: "done",
                            due_date: task.due_date,
                            reminder_at: task.reminder_at ? task.reminder_at.slice(0, 16) : "",
                          })
                        }
                        type="button"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button className="glass-button text-rose-200" onClick={() => deleteMutation.mutate(task.id)} type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
                {grouped[groupKey].length === 0 ? <EmptyBlock label="Порожньо." /> : null}
              </div>
            ))}
          </section>

          <section className="glass-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">{draft.id ? "Редагування задачі" : "Нова задача"}</h2>
              <button
                className="glass-button"
                onClick={async () => {
                  if ("Notification" in window && Notification.permission === "default") {
                    await Notification.requestPermission();
                  }
                }}
                type="button"
              >
                <BellRing className="mr-2 inline h-4 w-4" />
                Дозвіл на нагадування
              </button>
            </div>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, property_id: event.target.value }))} required value={draft.property_id}>
                <option value="">Оберіть об'єкт</option>
                {(propertiesQuery.data ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, tenant_id: event.target.value }))} value={draft.tenant_id}>
                <option value="">Без орендаря</option>
                {(tenantsQuery.data ?? [])
                  .filter((tenant) => !draft.property_id || tenant.property_id === draft.property_id)
                  .map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.full_name}
                    </option>
                  ))}
              </select>
              <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Назва" required value={draft.title} />
              <textarea className="glass-input min-h-[120px]" onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Опис" value={draft.description} />
              <div className="grid gap-4 md:grid-cols-2">
                <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))} value={draft.priority}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
                <select className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TaskStatus }))} value={draft.status}>
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
                  <option value="overdue">overdue</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))} required type="date" value={draft.due_date} />
                <input className="glass-input" onChange={(event) => setDraft((current) => ({ ...current, reminder_at: event.target.value }))} type="datetime-local" value={draft.reminder_at} />
              </div>
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

export default Tasks;
