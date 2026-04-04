import { Building2, CreditCard, TrendingUp, AlertTriangle, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import PaymentRow from "@/components/PaymentRow";
import PropertyCard from "@/components/PropertyCard";
import { motion } from "framer-motion";
import lg from "@/assets/234.jpg";



const recentPayments = [
  { type: "rent" as const, property: "вул. Хрещатик, 10, кв. 5", amount: 15000, date: "01.04.2026", status: "paid" as const },
  { type: "utilities" as const, property: "вул. Шевченка, 22", amount: 2340, date: "03.04.2026", status: "pending" as const },
  { type: "internet" as const, property: "вул. Хрещатик, 10, кв. 5", amount: 350, date: "28.03.2026", status: "overdue" as const },
  { type: "rent" as const, property: "вул. Франка, 8", amount: 12000, date: "01.04.2026", status: "pending" as const },
];

const topProperties = [
  { name: "Квартира на Хрещатику", address: "вул. Хрещатик, 10, кв. 5", type: "Квартира", status: "rented" as const, tenant: "Олена Петренко", rent: 15000 },
  { name: "Студія на Шевченка", address: "вул. Шевченка, 22", type: "Квартира", status: "rented" as const, tenant: "Ігор Коваленко", rent: 10000 },
  { name: "Офіс на Франка", address: "вул. Франка, 8", type: "Комерція", status: "free" as const, rent: 25000 },
];

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-accent">
              <img src={lg} alt="Logo" className="w-8 h-8 object-cover" />
            </div>
            <span className="font-semibold text-accent tracking-tight">obka</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Додати</span>
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={TrendingUp} label="Дохід за місяць" value="42 350 ₴" trend="+12% від березня" trendUp index={0} />
          <StatCard icon={CreditCard} label="Очікувані" value="14 340 ₴" index={1} />
          <StatCard icon={AlertTriangle} label="Прострочені" value="350 ₴" trend="1 платіж" trendUp={false} index={2} />
          <StatCard icon={Building2} label="Об'єкти" value="5" trend="3 здано" trendUp index={3} />
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Recent payments */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Останні платежі</h2>
              <a href="/payments" className="text-sm text-primary hover:underline">Всі →</a>
            </div>
            <div className="space-y-3">
              {recentPayments.map((p, i) => (
                <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
                  <PaymentRow {...p} />
                </div>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Об'єкти</h2>
              <a href="/properties" className="text-sm text-primary hover:underline">Всі →</a>
            </div>
            <div className="space-y-3">
              {topProperties.map((p, i) => (
                <PropertyCard key={i} {...p} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
