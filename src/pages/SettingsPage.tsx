import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";

const SettingsPage = () => {
  const { user, logout } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader description="Профіль, роль, браузерні нагадування та активна сесія." title="Налаштування" />
        <section className="glass-card grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Користувач</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{user?.full_name}</h2>
            <p className="mt-2 text-sm text-slate-300">{user?.email}</p>
            <p className="mt-1 text-sm text-slate-400">Роль: {user?.role}</p>
          </div>
          <div className="space-y-3">
            <button
              className="glass-button w-full justify-center"
              onClick={async () => {
                if ("Notification" in window) {
                  await Notification.requestPermission();
                }
              }}
              type="button"
            >
              Увімкнути локальні нагадування
            </button>
            <button className="glass-button w-full justify-center text-rose-200" onClick={logout} type="button">
              Вийти з акаунта
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
