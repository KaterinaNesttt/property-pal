import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, User2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const copy = {
  login: "\u0412\u0445\u0456\u0434",
  register: "\u0420\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u044f \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430",
  name: "\u0406\u043c'\u044f",
  password: "\u041f\u0430\u0440\u043e\u043b\u044c",
  busy: "\u041e\u0431\u0440\u043e\u0431\u043a\u0430...",
  submitLogin: "\u0423\u0432\u0456\u0439\u0442\u0438",
  submitRegister: "\u0421\u0442\u0432\u043e\u0440\u0438\u0442\u0438 \u0432\u043b\u0430\u0441\u043d\u0438\u043a\u0430",
  heading: "\u0412\u0430\u0441 \u0432\u0456\u0442\u0430\u0454 Jopka Corporation.",
  subheading: "\u041a\u0435\u0440\u0443\u0439. \u041f\u043e\u0441\u0435\u043b\u044f\u0439. \u0417\u0430\u0440\u043e\u0431\u043b\u044f\u0439.",
  cards: [
    "\u041c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u043e \u043c\u043e\u0436\u043b\u0438\u0432\u0430 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0430\u0446\u0456\u044f",
    "\u041d\u0435 \u0437\u0430\u0431\u0443\u0432\u0430\u0439 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044e\u0432\u0430\u0442\u0438 \u0441\u0432\u043e\u0457\u0445 \u043e\u0440\u0435\u043d\u0434\u0430\u0440\u0456\u0432",
    "\u041d\u0435 \u0456\u0433\u043d\u043e\u0440\u0443\u0439 \u0441\u043f\u043e\u0432\u0456\u0449\u0435\u043d\u043d\u044f",
  ],
};

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
                {copy.login}
              </button>
              <button
                className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-gradient text-white" : "text-slate-400"}`}
                onClick={() => setMode("register")}
                type="button"
              >
                {copy.register}
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              {mode === "register" ? (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                    <User2 className="h-4 w-4" />
                    {copy.name}
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
                  {copy.password}
                </span>
                <input className="glass-input" minLength={6} name="password" required type="password" />
              </label>

              <button className="glass-button w-full justify-center bg-gradient text-white" disabled={busy} type="submit">
                {busy ? copy.busy : mode === "login" ? copy.submitLogin : copy.submitRegister}
              </button>
            </form>
          </section>

          <section className="glass-card p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-btns">Property Pal</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight text-white md:text-5xl">{copy.heading}</h1>
            <p className="mt-5 max-w-2xl text-base text-slate-300">{copy.subheading}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {copy.cards.map((item) => (
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
