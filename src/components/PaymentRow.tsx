import { CreditCard, Droplets, Pencil, Trash2, Wifi, Zap } from "lucide-react";
import { Payment } from "@/lib/types";
import { formatDate, money } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

const icons = {
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

interface PaymentRowProps {
  payment: Payment;
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
  showActions?: boolean;
}

const PaymentRow = ({ payment, onEdit, onDelete, showActions = true }: PaymentRowProps) => {
  const Icon = icons[payment.payment_type];

  return (
    <div className="glass-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="glass-icon h-11 w-11 shrink-0">
          <Icon className="h-5 w-5 text-cyan-200" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{typeLabels[payment.payment_type]}</h3>
            <StatusBadge value={payment.status} label={payment.status === "paid" ? "Оплачено" : payment.status === "pending" ? "Очікує" : "Прострочено"} />
          </div>
          <p className="mt-1 text-sm text-slate-300">{payment.property_name ?? "Без об'єкта"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {payment.tenant_name ?? "Без орендаря"} · Період {payment.period_month}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <div className="text-left md:text-right">
          <p className="text-lg font-semibold text-white">{money(payment.total_amount)}</p>
          <p className="text-xs text-slate-400">
            До {formatDate(payment.due_date)} · Сплачено {formatDate(payment.paid_at)}
          </p>
        </div>
        {showActions ? (
          <div className="flex gap-2">
            <button className="glass-button" onClick={() => onEdit(payment)} type="button">
              <Pencil className="h-4 w-4" />
            </button>
            <button className="glass-button text-rose-200" onClick={() => onDelete(payment)} type="button">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaymentRow;
