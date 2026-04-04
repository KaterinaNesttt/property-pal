import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, User2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const AuthPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);

    try {
      if (mode === "login") {
        await login({
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
      } else {
        await register({
          full_name: String(form.get("full_name")),
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">


          <section className="glass-card p-8">
            <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-gradient text-white" : "text-slate-400"}`}
                onClick={() => setMode("login")}
                type="button"
              >
                Вхід
              </button>
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-gradient text-white" : "text-slate-400"}`}
                onClick={() => setMode("register")}
                type="button"
              >
                Реєстрація власника
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              {mode === "register" ? (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                    <User2 className="h-4 w-4" />
                    Ім'я
                  </span>
                  <input className="glass-input" name="full_name" required />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="h-4 w-4" />
                  Email
                </span>
                <input className="glass-input" name="email" required type="email" />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                  <LockKeyhole className="h-4 w-4" />
                  Пароль
                </span>
                <input className="glass-input" minLength={6} name="password" required type="password" />
              </label>

              <button className="glass-button w-full justify-center bg-gradient text-white" disabled={busy} type="submit">
                {busy ? "Обробка..." : mode === "login" ? "Увійти" : "Створити власника"}
              </button>
            </form>
          </section>

                    <section className="glass-card p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-btns">Property Pal</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight text-white md:text-5xl">
              Вас вітає Jopka Corporation.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-300">
              Керуй. Поселяй. Заробляй.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                "Максимально можлива автоматизація",
                "Не забувай контролювати своїх орендарів",
                "Не ігноруй сповіщення",
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
