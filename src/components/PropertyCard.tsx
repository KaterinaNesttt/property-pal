import { Building2, MapPin, User } from "lucide-react";

interface PropertyCardProps {
  name: string;
  address: string;
  type: string;
  status: "free" | "rented" | "repair";
  tenant?: string;
  rent?: number;
}

const statusConfig = {
  free: { label: "Вільна", className: "bg-success/15 text-success" },
  rented: { label: "Здана", className: "bg-primary/15 text-primary" },
  repair: { label: "Ремонт", className: "bg-warning/15 text-warning" },
};

const PropertyCard = ({ name, address, type, status, tenant, rent }: PropertyCardProps) => {
  const statusInfo = statusConfig[status];

  return (
    <div className="glass-card p-5 animate-slide-up hover:scale-[1.01] transition-all duration-300 cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{type}</p>
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{address}</span>
        </div>
        {tenant && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span>{tenant}</span>
          </div>
        )}
      </div>

      {rent && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Орендна плата</span>
            <span className="font-semibold text-foreground">{rent.toLocaleString()} ₴/міс</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyCard;
