import { FormEvent } from "react";
import IosDrumPicker from "@/components/ui/ios-date-picker";
import { Property } from "@/lib/types";

export interface TenantFormValues {
  id: string;
  property_id: string;
  full_name: string;
  phone: string;
  lease_start: string;
  monthly_rent: string;
  notes: string;
}

interface TenantFormProps {
  draft: TenantFormValues;
  availableProperties: Property[];
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (updater: (current: TenantFormValues) => TenantFormValues) => void;
  onReset: () => void;
}

const TenantForm = ({ draft, availableProperties, isPending, onSubmit, onChange, onReset }: TenantFormProps) => {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <select className="glass-input glass-select" onChange={(event) => onChange((current) => ({ ...current, property_id: event.target.value }))} required value={draft.property_id}>
        <option value="">Оберіть об'єкт</option>
        {availableProperties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name} {property.status === "rented" ? "(зайнятий)" : ""}
          </option>
        ))}
      </select>
      <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, full_name: event.target.value }))} placeholder="ПІБ" required value={draft.full_name} />
      <input className="glass-input" onChange={(event) => onChange((current) => ({ ...current, phone: event.target.value }))} placeholder="Телефон" required value={draft.phone} />
      <IosDrumPicker
        onChange={(value) => onChange((current) => ({ ...current, lease_start: value }))}
        placeholder="Оберіть дату"
        value={draft.lease_start}
      />
      <input
        className="glass-input"
        min={0}
        onChange={(event) => onChange((current) => ({ ...current, monthly_rent: event.target.value }))}
        placeholder="Сума орендної плати"
        required
        type="number"
        value={draft.monthly_rent}
      />
      <textarea className="glass-input min-h-[120px]" onChange={(event) => onChange((current) => ({ ...current, notes: event.target.value }))} placeholder="Нотатки" value={draft.notes} />
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

export default TenantForm;
