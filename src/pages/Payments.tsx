import { Plus, Filter } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PaymentRow from "@/components/PaymentRow";
import StatCard from "@/components/StatCard";
import { CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";

const allPayments = [
  { type: "rent" as const, property: "вул. Хрещатик, 10, кв. 5", amount: 15000, date: "01.04.2026", status: "paid" as const },
  { type: "utilities" as const, property: "вул. Шевченка, 22", amount: 2340, date: "03.04.2026", status: "pending" as const },
  { type: "internet" as const, property: "вул. Хрещатик, 10, кв. 5", amount: 350, date: "28.03.2026", status: "overdue" as const },
  { type: "rent" as const, property: "вул. Франка, 8", amount: 12000, date: "01.04.2026", status: "pending" as const },
  { type: "rent" as const, property: "вул. Сагайдачного, 3", amount: 18000, date: "01.04.2026", status: "paid" as const },
  { type: "utilities" as const, property: "вул. Хрещатик, 10, кв. 5", amount: 1870, date: "02.04.2026", status: "paid" as const },
  { type: "rent" as const, property: "вул. Шевченка, 22", amount: 10000, date: "01.04.2026", status: "paid" as const },
  { type: "other" as const, property: "Будинок у Буче", amount: 5500, date: "15.03.2026", status: "paid" as const },
];

const Payments = () => {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all" ? allPayments : allPayments.filter(p => p.status === statusFilter);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Платежі</h1>
          <button className="glass-button flex items-center gap-2 text-sm text-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Додати платіж</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={CheckCircle} label="Оплачено" value="45 870 ₴" />
          <StatCard icon={CreditCard} label="Очікується" value="14 340 ₴" />
          <StatCard icon={AlertTriangle} label="Прострочено" value="350 ₴" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {[
            { key: "all", label: "Всі" },
            { key: "paid", label: "Оплачені" },
            { key: "pending", label: "Очікуються" },
            { key: "overdue", label: "Прострочені" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                statusFilter === f.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
              <PaymentRow {...p} />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Payments;
