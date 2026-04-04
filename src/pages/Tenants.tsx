import { Plus, Phone, Mail, Building2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { User, Calendar, DollarSign, MapPin, } from "lucide-react";

const tenants = [
  { name: "Олена Петренко", phone: "+380 67 123 4567", email: "olena@email.com", property: "вул. Хрещатик, 10, кв. 5", status: "active", debt: 0 },
  { name: "Ігор Коваленко", phone: "+380 50 234 5678", email: "igor@email.com", property: "вул. Шевченка, 22", status: "active", debt: 2340 },
  { name: "Марія Сидоренко", phone: "+380 63 345 6789", email: "maria@email.com", property: "вул. Сагайдачного, 3", status: "active", debt: 0 },
];

const Tenants = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Орендарі</h1>
          <button className="glass-button flex items-center gap-2 text-sm text-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Додати орендаря</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t, i) => (
            <div
              key={i}
              className="glass-card p-5 animate-slide-up hover:scale-[1.01] transition-all duration-300 cursor-pointer"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                  {t.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.name}</h3>
                  <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full font-medium">
                    Активний
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{t.property}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{t.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t.email}</span>
                </div>
              </div>

              {t.debt > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Заборгованість</span>
                    <span className="font-semibold text-destructive text-sm">{t.debt.toLocaleString()} ₴</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Tenants;
