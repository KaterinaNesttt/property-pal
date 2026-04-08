import { FormEvent } from "react";
import IosDrumPicker from "@/components/ui/ios-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Select onValueChange={(value) => onChange((current) => ({ ...current, property_id: value }))} value={draft.property_id}>
        <SelectTrigger className="glass-input h-auto border-white/10 bg-black/20 px-4 py-3 text-left text-white backdrop-blur-xl">
          <SelectValue placeholder="Оберіть об'єкт" />
        </SelectTrigger>
        <SelectContent>
          {availableProperties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name} {property.status === "rented" ? "(зайнятий)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
