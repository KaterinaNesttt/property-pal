import { CreditCard, Droplets, Wifi, Zap } from "lucide-react";

interface PaymentRowProps {
  type: "rent" | "utilities" | "internet" | "other";
  property: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "overdue";
}

const typeIcons = {
  rent: CreditCard,
  utilities: Droplets,
  internet: Wifi,
  other: Zap,
};

const typeLabels = {
  rent: "Оренда",
  utilities: "Комунальні",
  internet: "Інтернет",
  other: "Інше",
};

const statusConfig = {
  paid: { label: "Оплачено", className: "bg-success/15 text-success" },
  pending: { label: "Очікується", className: "bg-warning/15 text-warning" },
  overdue: { label: "Прострочено", className: "bg-destructive/15 text-destructive" },
};

const PaymentRow = ({ type, property, amount, date, status }: PaymentRowProps) => {
  const Icon = typeIcons[type];
  const statusInfo = statusConfig[status];

  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 glass-card hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden">
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground text-sm truncate">{typeLabels[type]}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{property}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{date}</p>
          <p className="font-semibold text-foreground text-sm">{amount.toLocaleString()} ₴</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentRow;
