import { User, Bell, Shield, Palette } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const sections = [
  { icon: User, label: "Профіль", description: "Ім'я, email, пароль" },
  { icon: Bell, label: "Сповіщення", description: "Push, email нагадування" },
  { icon: Shield, label: "Безпека", description: "Двофакторна авторизація" },
  { icon: Palette, label: "Зовнішній вигляд", description: "Тема, мова" },
];

const SettingsPage = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Налаштування</h1>

        <div className="space-y-3">
          {sections.map((s, i) => (
            <div
              key={i}
              className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:scale-[1.01] transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{s.label}</h3>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
