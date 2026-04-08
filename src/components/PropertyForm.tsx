import { FormEvent } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  showNameField?: boolean;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (updater: (current: PropertyFormValues) => PropertyFormValues) => void;
  onReset: () => void;
}

const PropertyForm = ({ draft, activeTenantsCount, roleLabel, showNameField = true, isPending, onSubmit, onChange, onReset }: PropertyFormProps) => {
  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-black/20 p-5 backdrop-blur-2xl">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Основні дані</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Паспорт об'єкта</h3>
        </div>
        <div className="grid gap-4">
          {showNameField ? <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} placeholder="Назва" required value={draft.name} /> : null}
          <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, address: event.target.value }))} placeholder="Адреса" required value={draft.address} />
          <div className="grid gap-4 md:grid-cols-2">
            <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, type: event.target.value }))} placeholder="Тип" required value={draft.type} />
            <Select onValueChange={(value) => onChange((current) => ({ ...current, status: value as PropertyStatus }))} value={draft.status}>
              <SelectTrigger className="glass-input h-auto border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-xl">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Вільний</SelectItem>
                <SelectItem value="rented">Зданий</SelectItem>
                <SelectItem value="maintenance">Обслуговування</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-black/20 p-5 backdrop-blur-2xl">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Фінанси</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Орендна ставка</h3>
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Активних орендарів: {activeTenantsCount}{roleLabel ? `. Поточна роль: ${roleLabel}.` : "."}
        </div>
      </div>
      <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-black/20 p-5 backdrop-blur-2xl">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Контекст</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Нотатки по об'єкту</h3>
        </div>
        <textarea className="glass-input min-h-[140px]" onChange={(event) => onChange((current) => ({ ...current, notes: event.target.value }))} placeholder="Нотатки" value={draft.notes} />
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
