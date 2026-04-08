import { ChangeEvent, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import ProfileAvatarEditor from "@/components/ProfileAvatarEditor";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";

const SettingsPage = () => {
  const { preferences, saveProfile, setPreferences, updateBadgePreferences, user, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.full_name, user?.phone]);

  const handleTextChange =
    (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) =>
      setter(event.target.value);

  const saveAll = async () => {
    setSaving(true);
    try {
      await saveProfile({
        full_name: fullName,
        phone,
        avatar: user?.avatar ?? null,
        preferences,
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePurple = async () => {
    const nextThemeMode = preferences.themeMode === "purple" ? "default" : "purple";
    const nextPreferences = { ...preferences, themeMode: nextThemeMode };
    setPreferences({ themeMode: nextThemeMode });
    try {
      await saveProfile({
        full_name: fullName,
        phone,
        avatar: user?.avatar ?? null,
        preferences: nextPreferences,
      });
    } catch {
      toast.error("Не вдалося зберегти тему");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          description=""
          title="Налаштування"
        />

        <section className="glass-card grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Профіль</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{user?.full_name}</h2>
              <p className="mt-2 text-sm text-slate-300">{user?.email}</p>
            </div>

            <ProfileAvatarEditor
              avatar={user?.avatar ?? null}
              scale={1}
              x={0}
              y={0}
              onSave={(patch) => {
                setPreferences({
                  avatarScale: 1,
                  avatarX: 0,
                  avatarY: 0,
                });
                void saveProfile({
                  full_name: fullName,
                  phone,
                  avatar: patch.avatar,
                  preferences: {
                    ...preferences,
                    avatarScale: 1,
                    avatarX: 0,
                    avatarY: 0,
                  },
                });
              }}
            />
          </div>

          <div className="grid gap-6">
            <div className="grid gap-4">
              <h3 className="text-lg font-semibold text-white">Дані користувача</h3>
              <input
                className="glass-input"
                onChange={handleTextChange(setFullName)}
                placeholder="Ім'я та прізвище"
                value={fullName}
              />
              <input
                className="glass-input"
                onChange={handleTextChange(setPhone)}
                placeholder="Номер телефону"
                value={phone}
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

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              Більше фіолетового
              <Switch checked={preferences.themeMode === "purple"} onCheckedChange={togglePurple} />
            </label>

            <button
              className="glass-button w-full justify-center bg-btns/15 text-white"
              disabled={saving}
              onClick={saveAll}
              type="button"
            >
              {saving ? "Збереження..." : "Зберегти профіль"}
            </button>

            <button
              className="glass-button w-full justify-center border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              onClick={logout}
              type="button"
            >
              <LogOut className="mr-2 inline h-4 w-4" />
              Вийти
            </button>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              Локальні нагадування
              <Switch
                defaultChecked
                onCheckedChange={async (checked) => {
                  if (checked && "Notification" in window) {
                    await Notification.requestPermission();
                  }
                }}
              />
            </label>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;