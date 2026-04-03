import { FileText, Download, Share2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const invoices = [
  { id: "INV-2026-04-001", property: "вул. Хрещатик, 10, кв. 5", tenant: "Олена Петренко", total: 17220, date: "01.04.2026", status: "sent" },
  { id: "INV-2026-04-002", property: "вул. Шевченка, 22", tenant: "Ігор Коваленко", total: 12340, date: "01.04.2026", status: "draft" },
  { id: "INV-2026-03-003", property: "вул. Сагайдачного, 3", tenant: "Марія Сидоренко", total: 18850, date: "01.03.2026", status: "paid" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Чернетка", className: "bg-muted text-muted-foreground" },
  sent: { label: "Відправлено", className: "bg-primary/15 text-primary" },
  paid: { label: "Оплачено", className: "bg-success/15 text-success" },
};

const Invoices = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Накладні</h1>
          <button className="glass-button flex items-center gap-2 text-sm text-primary">
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">Створити</span>
          </button>
        </div>

        <div className="space-y-3">
          {invoices.map((inv, i) => {
            const st = statusConfig[inv.status];
            return (
              <div
                key={i}
                className="glass-card p-5 animate-slide-up flex items-center gap-4"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-foreground text-sm">{inv.id}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{inv.tenant} · {inv.property}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-foreground">{inv.total.toLocaleString()} ₴</p>
                  <p className="text-xs text-muted-foreground">{inv.date}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Invoices;
