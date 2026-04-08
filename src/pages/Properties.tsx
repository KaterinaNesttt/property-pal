import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import PropertyCard from "@/components/PropertyCard";
import PropertyForm, { PropertyFormValues } from "@/components/PropertyForm";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Property, PropertyStatus, Tenant } from "@/lib/types";

const initialForm: PropertyFormValues = {
  id: "",
  name: "",
  address: "",
  type: "Квартира",
  status: "free",
  rent_amount: "",
  notes: "",
};

const Properties = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PropertyStatus>("all");
  const [draft, setDraft] = useState<PropertyFormValues>(initialForm);
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
    mutationFn: (payload: PropertyFormValues) => {
      const body = { ...payload, name: payload.id ? payload.name : payload.address, rent_amount: Number(payload.rent_amount || 0) };
      return payload.id
        ? api.put<Property>(`/api/properties/${payload.id}`, body, token)
        : api.post<Property>("/api/properties", body, token);
    },
    onSuccess: () => {
      toast.success("Об'єкт збережено");
      setDraft(initialForm);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
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

  const activeTenantsCount = useMemo(
    () => (tenantsQuery.data ?? []).filter((tenant) => tenant.is_active === 1).length,
    [tenantsQuery.data],
  );

  const roleLabel = user?.role === "superadmin" ? "Суперадмін" : user?.role === "owner" ? "Власник" : "Орендар";

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
              <Plus className="mr-2 inline h-4 w-4" />
              Новий об'єкт
            </button>
          }
          description=""
          title="Нерухомість"
        />

        {propertiesQuery.isLoading || tenantsQuery.isLoading ? <LoadingBlock label="Завантаження об'єктів..." /> : null}
        {propertiesQuery.error || tenantsQuery.error ? <ErrorBlock label="Не вдалося отримати об'єкти або орендарів." /> : null}

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
            <Select onValueChange={(value) => setStatus(value as "all" | PropertyStatus)} value={status}>
              <SelectTrigger className="glass-input h-auto max-w-xs border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-xl">
                <SelectValue placeholder="Усі статуси" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі статуси</SelectItem>
                <SelectItem value="free">Вільний</SelectItem>
                <SelectItem value="rented">Зданий</SelectItem>
                <SelectItem value="maintenance">Обслуговування</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {items.map((property) => (
              <PropertyCard key={property.id} onDelete={() => undefined} onEdit={() => undefined} property={property} />
            ))}
          </div>
          {!propertiesQuery.isLoading && items.length === 0 ? <EmptyBlock label="Під поточні фільтри нічого не знайдено." /> : null}
        </section>

        <Dialog onOpenChange={setOpen} open={open}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-black/90 p-0 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Редагування об'єкта" : "Новий об'єкт"}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Заповніть основні дані по об'єкту нерухомості.
              </DialogDescription>
            </DialogHeader>
            </div>
            <div className="px-6 py-6">
            <PropertyForm
              activeTenantsCount={activeTenantsCount}
              draft={draft}
              isPending={mutation.isPending}
              onChange={setDraft}
              onReset={() => setDraft(initialForm)}
              onSubmit={submit}
              roleLabel={roleLabel}
              showNameField={false}
            />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Properties;
