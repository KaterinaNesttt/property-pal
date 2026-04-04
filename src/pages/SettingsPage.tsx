import { ChangeEvent } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import ProfileAvatarEditor from "@/components/ProfileAvatarEditor";
import { useAuth } from "@/lib/auth";

const SettingsPage = () => {
  const { preferences, updateBadgePreferences, updatePreferences, user } = useAuth();

  const handleTextChange =
    (key: "full_name" | "phone") => (event: ChangeEvent<HTMLInputElement>) =>
      updatePreferences({ [key]: event.target.value } as Pick<typeof preferences, typeof key>);

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader description="Профіль користувача, аватарка, сповіщення та лічильники в мобільному меню." title="Налаштування" />

        <section className="glass-card grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Профіль</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{user?.full_name}</h2>
              <p className="mt-2 text-sm text-slate-300">{user?.email}</p>
              <p className="mt-1 text-sm text-slate-400">Роль: {user?.role}</p>
            </div>

            <ProfileAvatarEditor
              avatar={preferences.avatar}
              onChange={updatePreferences}
              scale={preferences.avatarScale}
              x={preferences.avatarX}
              y={preferences.avatarY}
            />
          </div>

          <div className="grid gap-6">
            <div className="grid gap-4">
              <h3 className="text-lg font-semibold text-white">Дані користувача</h3>
              <input
                className="glass-input"
                onChange={handleTextChange("full_name")}
                placeholder="Ім'я та прізвище"
                value={preferences.full_name}
              />
              <input
                className="glass-input"
                onChange={handleTextChange("phone")}
                placeholder="Номер телефону"
                value={preferences.phone}
              />
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Лічильники в мобільному меню</h3>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    checked={preferences.badgePreferences.all}
                    onChange={(event) => updateBadgePreferences({ all: event.target.checked })}
                    type="checkbox"
                  />
                  Увімкнути всі
                </label>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Лічильник вільних об'єктів
                <input
                  checked={preferences.badgePreferences.properties}
                  disabled={!preferences.badgePreferences.all}
                  onChange={(event) => updateBadgePreferences({ properties: event.target.checked })}
                  type="checkbox"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Лічильник актуальних задач
                <input
                  checked={preferences.badgePreferences.tasks}
                  disabled={!preferences.badgePreferences.all}
                  onChange={(event) => updateBadgePreferences({ tasks: event.target.checked })}
                  type="checkbox"
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Лічильник неоплачених рахунків
                <input
                  checked={preferences.badgePreferences.invoices}
                  disabled={!preferences.badgePreferences.all}
                  onChange={(event) => updateBadgePreferences({ invoices: event.target.checked })}
                  type="checkbox"
                />
              </label>
            </div>

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
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
