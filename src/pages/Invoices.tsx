import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, money } from "@/lib/format";
import { Payment } from "@/lib/types";

const Invoices = () => {
  const { token } = useAuth();
  const paymentsQuery = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<Payment[]>("/api/payments", token),
  });
  const today = new Date().toISOString().slice(0, 10);
  const payments = useMemo(
    () =>
      (paymentsQuery.data ?? []).map((payment) => ({
        ...payment,
        status: payment.status === "pending" && payment.due_date < today ? "overdue" : payment.status,
      })),
    [paymentsQuery.data, today],
  );

  const invoices = useMemo(
    () =>
      payments.map((payment) => ({
        id: `INV-${payment.period_month.replace("-", "")}-${payment.id.slice(0, 6).toUpperCase()}`,
        property: payment.property_name ?? "Без об'єкта",
        tenant: payment.tenant_name ?? "Без орендаря",
        total: payment.total_amount,
        due_date: payment.due_date,
        status: payment.status,
      })),
    [payments],
  );

  if (paymentsQuery.isLoading) {
    return (
      <AppLayout>
        <LoadingBlock label="Завантаження рахунків…" />
      </AppLayout>
    );
  }

  if (paymentsQuery.error) {
    return (
      <AppLayout>
        <ErrorBlock label="Не вдалося згенерувати рахунки з оплат." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader description="Перегляд та відстеження рахунків." title="Рахунки" />
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="glass-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="glass-icon h-11 w-11">
                  <FileText className="h-5 w-5 text-btns" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-white">{invoice.id}</h2>
                    <StatusBadge value={invoice.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    {invoice.tenant} · {invoice.property}
                  </p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-lg font-semibold text-white">{money(invoice.total)}</p>
                <p className="text-sm text-slate-400">До {formatDate(invoice.due_date)}</p>
              </div>
            </article>
          ))}
          {invoices.length === 0 ? <EmptyBlock label="Немає рахунків для побудови." /> : null}
        </div>
      </div>
    </AppLayout>
  );
};

export default Invoices;
