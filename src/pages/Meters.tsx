import { Droplets, Flame, Zap, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const meters = [
  { type: "water", icon: Droplets, label: "Вода", property: "вул. Хрещатик, 10", previous: 1245, current: 1268, tariff: 42.78, unit: "м³" },
  { type: "gas", icon: Flame, label: "Газ", property: "вул. Хрещатик, 10", previous: 567, current: 573, tariff: 7.96, unit: "м³" },
  { type: "electric", icon: Zap, label: "Електрика", property: "вул. Хрещатик, 10", previous: 4521, current: 4689, tariff: 2.64, unit: "кВт·год" },
  { type: "water", icon: Droplets, label: "Вода", property: "вул. Шевченка, 22", previous: 890, current: 912, tariff: 42.78, unit: "м³" },
  { type: "electric", icon: Zap, label: "Електрика", property: "вул. Шевченка, 22", previous: 3210, current: 3345, tariff: 2.64, unit: "кВт·год" },
];

const Meters = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Лічильники</h1>
          <button className="glass-button flex items-center gap-2 text-sm text-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Додати показники</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meters.map((m, i) => {
            const diff = m.current - m.previous;
            const cost = diff * m.tariff;
            return (
              <div
                key={i}
                className="glass-card p-5 animate-slide-up hover:scale-[1.01] transition-all duration-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <m.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{m.label}</h3>
                    <p className="text-xs text-muted-foreground">{m.property}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Попередній</p>
                    <p className="font-semibold text-foreground text-sm">{m.previous}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Поточний</p>
                    <p className="font-semibold text-primary text-sm">{m.current}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Різниця</p>
                    <p className="font-semibold text-warning text-sm">{diff} {m.unit}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Тариф: {m.tariff} ₴/{m.unit}</span>
                  <span className="font-bold text-foreground">{cost.toFixed(2)} ₴</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Meters;
