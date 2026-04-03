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
    <div className="glass-card p-4 sm:p-5 animate-slide-up hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{name}</h3>
            <p className="text-xs text-muted-foreground">{type}</p>
          </div>
        </div>
        <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${statusInfo.className}`}>
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
