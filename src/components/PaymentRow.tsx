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
    <div className="flex items-center gap-4 p-4 glass-card hover:scale-[1.01] transition-all duration-300 cursor-pointer">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{typeLabels[type]}</p>
        <p className="text-xs text-muted-foreground truncate">{property}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-foreground text-sm">{amount.toLocaleString()} ₴</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    </div>
  );
};

export default PaymentRow;
