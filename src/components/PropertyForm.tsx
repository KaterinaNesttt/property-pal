import { FormEvent } from "react";
import { PropertyStatus } from "@/lib/types";

export interface PropertyFormValues {
  id: string;
  name: string;
  address: string;
  type: string;
  status: PropertyStatus;
  rent_amount: string;
  notes: string;
}

interface PropertyFormProps {
  draft: PropertyFormValues;
  activeTenantsCount: number;
  roleLabel?: string;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (updater: (current: PropertyFormValues) => PropertyFormValues) => void;
  onReset: () => void;
}

const PropertyForm = ({ draft, activeTenantsCount, roleLabel, isPending, onSubmit, onChange, onReset }: PropertyFormProps) => {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} placeholder="Назва" required value={draft.name} />
      <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, address: event.target.value }))} placeholder="Адреса" required value={draft.address} />
      <div className="grid gap-4 md:grid-cols-2">
        <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, type: event.target.value }))} placeholder="Тип" required value={draft.type} />
        <select className="glass-input glass-select" onChange={(event) => onChange((current) => ({ ...current, status: event.target.value as PropertyStatus }))} value={draft.status}>
          <option value="free">Вільний</option>
          <option value="rented">Зданий</option>
          <option value="maintenance">Обслуговування</option>
        </select>
      </div>
      <input
        className="glass-input"
        min={0}
        onChange={(event) => onChange((current) => ({ ...current, rent_amount: event.target.value }))}
        placeholder="Місячна оренда"
        required
        type="number"
        value={draft.rent_amount}
      />
      <textarea className="glass-input min-h-[120px]" onChange={(event) => onChange((current) => ({ ...current, notes: event.target.value }))} placeholder="Нотатки" value={draft.notes} />
      <div className="rounded-2xl border border-black/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
        Активних орендарів: {activeTenantsCount}{roleLabel ? `. Поточна роль: ${roleLabel}.` : "."}
      </div>
      <div className="flex gap-3">
        <button className="glass-button flex-1 justify-center bg-btns/15 text-white" disabled={isPending} type="submit">
          {isPending ? "Збереження..." : draft.id ? "Оновити" : "Створити"}
        </button>
        <button className="glass-button" onClick={onReset} type="button">
          Скинути
        </button>
      </div>
    </form>
  );
};

export default PropertyForm;
