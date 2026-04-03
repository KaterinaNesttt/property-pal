import { Plus, Search } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PropertyCard from "@/components/PropertyCard";
import { useState } from "react";

const allProperties = [
  { name: "Квартира на Хрещатику", address: "вул. Хрещатик, 10, кв. 5", type: "Квартира", status: "rented" as const, tenant: "Олена Петренко", rent: 15000 },
  { name: "Студія на Шевченка", address: "вул. Шевченка, 22", type: "Квартира", status: "rented" as const, tenant: "Ігор Коваленко", rent: 10000 },
  { name: "Офіс на Франка", address: "вул. Франка, 8", type: "Комерція", status: "free" as const, rent: 25000 },
  { name: "Будинок у Буче", address: "вул. Садова, 15", type: "Будинок", status: "repair" as const },
  { name: "Квартира на Подолі", address: "вул. Сагайдачного, 3", type: "Квартира", status: "rented" as const, tenant: "Марія Сидоренко", rent: 18000 },
];

const Properties = () => {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? allProperties : allProperties.filter(p => p.status === filter);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Нерухомість
          </h1>
          <button className="glass-button flex items-center gap-2 text-sm text-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Додати об'єкт</span>
          </button>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Пошук об'єкту..."
              className="glass-input w-full pl-10 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: "all", label: "Всі" },
              { key: "rented", label: "Здані" },
              { key: "free", label: "Вільні" },
              { key: "repair", label: "Ремонт" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === f.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground glass-button"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
              <PropertyCard {...p} />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Properties;
