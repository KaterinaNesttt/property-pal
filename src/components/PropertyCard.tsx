import { Building2, Home, Pencil, Trash2, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Property } from "@/lib/types";
import { money } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  showActions?: boolean;
}

const statusLabel = {
  free: "Вільний",
  rented: "Зданий",
  maintenance: "Обслуговування",
};

const PropertyCard = ({ property, onEdit, onDelete, showActions = true }: PropertyCardProps) => {
  return (
    <div className="glass-card flex h-full flex-col justify-between gap-5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="glass-icon h-11 w-11">
              <Building2 className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{property.name}</h3>
              <p className="text-sm text-slate-400">{property.type}</p>
            </div>
          </div>
          <StatusBadge value={property.status} label={statusLabel[property.status]} />
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-start gap-2">
            <Home className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>{property.address}</span>
          </div>
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>{property.tenant_name || "Орендар не призначений"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Місячна оренда</p>
          <p className="mt-2 text-xl font-semibold text-white">{money(property.rent_amount)}</p>
        </div>
        {showActions ? (
          <div className="flex gap-2">
            <Link className="glass-button" to={`/properties/${property.id}`}>
              Деталі
            </Link>
            <button className="glass-button flex-1" onClick={() => onEdit(property)} type="button">
              <Pencil className="mr-2 inline h-4 w-4" />
              Редагувати
            </button>
            <button className="glass-button text-rose-200" onClick={() => onDelete(property)} type="button">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PropertyCard;
