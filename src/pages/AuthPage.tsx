import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, User2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import heroVideo from "@/assets/hero-video.mov";
import { useEffect, useRef } from "react";
import loginimg from "@/assets/login.png";

const copy = {
  login: "Вхід",
  register: "Реєстрація власника",
  name: "Ім'я",
  password: "Пароль",
  busy: "Обробка...",
  submitLogin: "Увійти",
  submitRegister: "Створити власника",
  heading: "Jopka App",
  subheading: "Керуй. Поселяй. Заробляй.",
  cards: [
    "Максимально можлива автоматизація",
    "Не забувай контролювати своїх орендарів",
    "Не ігноруй сповіщення",
  ],
};

const AuthPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
      video.playbackRate = 0.8;
    }
  }, []);

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


    
    <div className="min-h-screen  text-foreground">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          ref={videoRef}
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/hero-poster.webp"
          className="absolute w-full h-full object-center object-cover scale-125 "
        />
        <div className="absolute inset-0 bg-gradient-bg opacity-10 backdrop-blur-2xl" />
      </div>

      <div className="relative z-10 "></div>
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 md:px-8">
        <motion.div
          className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >

  <section className="glass-card  p-8 md:p-10 ">
            <p className="text-xs uppercase tracking-[0.24em] text-right text-accent mr-3">Batushka corp</p>
            <img src={loginimg} className="mt-5 opacity-80" alt="Logo"  />
            <p className="mt-5 max-w-2xl text-center text-base text-slate-300">{copy.subheading}</p>            
          </section>

          <section className="glass-card  p-8 md:p-10 ">
            {/* Tab switcher */}
            <div className="relative flex rounded-full border border-black/10 bg-black/20 p-1">
              <motion.span
                layout
                layoutId="auth-tab-indicator"
                className="absolute inset-y-1 rounded-full bg-gradient-blue"
                style={{ width: "50%", left: mode === "login" ? "0%" : "50%" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
              <button
                className="relative z-10 flex-1 rounded-full px-4 py-2 text-sm text-white transition-colors"
                onClick={() => setMode("login")}
                type="button"
              >
                {copy.login}
              </button>
              <button
                className="relative z-10 flex-1 rounded-full px-4 py-2 text-sm text-slate-400 transition-colors"
                onClick={() => setMode("register")}
                type="button"
              >
                {copy.register}
              </button>
            </div>

            <form className="mt-6" onSubmit={submit}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  className="space-y-4"
                  initial={{ opacity: 0, x: mode === "login" ? -14 : 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 14 : -14 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                >
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

                  <motion.button
                    className="glass-button w-full justify-center bg-gradient-light text-white"
                    disabled={busy}
                    type="submit"
                    whileTap={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  >
                    {busy ? copy.busy : mode === "login" ? copy.submitLogin : copy.submitRegister}
                  </motion.button>
                </motion.div>
              </AnimatePresence>
            </form>
          </section>

        
        </motion.div>
      </div>
      </div>
    
    
  );
};

export default AuthPage;