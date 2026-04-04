import { BarChart3, Building2, CreditCard, FileText, Gauge, Home, ListTodo, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const mainItems = [
  { to: "/", icon: Home, label: "Головна" },
  { to: "/properties", icon: Building2, label: "Об'єкти" },
  { to: "/payments", icon: CreditCard, label: "Оплати" },
  { to: "/tenants", icon: Users, label: "Орендарі" },
  { to: "/tasks", icon: ListTodo, label: "Задачі" },
];

const extraItems = [
  { to: "/meters", icon: Gauge, label: "Лічильники" },
  { to: "/analytics", icon: BarChart3, label: "Аналітика" },
  { to: "/invoices", icon: FileText, label: "Рахунки" },
  { to: "/settings", icon: Settings, label: "Налаштування" },
];

const MobileNav = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              aria-label="Закрити меню"
              className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              type="button"
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-[min(92vw,360px)] flex-col border-l border-white/10 bg-slate-950/88 p-5 shadow-2xl backdrop-blur-2xl"
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Property Pal</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{user?.full_name}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {user?.role === "superadmin" ? "Superadmin" : user?.role === "owner" ? "Owner" : "Tenant"}
                  </p>
                </div>
                <button className="glass-button" onClick={() => setOpen(false)} type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="mt-5 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {[...mainItems, ...extraItems].map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      className={`rounded-2xl border px-4 py-3 transition-all ${
                        active
                          ? "border-cyan-400/30 bg-cyan-400/10 text-white"
                          : "border-white/5 bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => setOpen(false)}
                      to={item.to}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </nav>

              <button className="glass-button mt-5 justify-center text-rose-200" onClick={logout} type="button">
                <LogOut className="mr-2 inline h-4 w-4" />
                Вийти
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-4 md:px-6 md:pb-6">
        <div className="pointer-events-auto mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-950/75 p-2 shadow-[0_25px_80px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
          <div className="grid grid-cols-6 gap-2">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  className={`flex min-h-[68px] flex-col items-center justify-center rounded-[1.35rem] px-2 py-3 text-center text-[11px] font-medium transition-all md:text-xs ${
                    active
                      ? "bg-cyan-400/15 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                  to={item.to}
                >
                  <Icon className={`mb-1 h-5 w-5 ${active ? "text-cyan-200" : ""}`} />
                  {item.label}
                </NavLink>
              );
            })}

            <button
              className={`flex min-h-[68px] flex-col items-center justify-center rounded-[1.35rem] px-2 py-3 text-center text-[11px] font-medium transition-all md:text-xs ${
                open ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => setOpen(true)}
              type="button"
            >
              <Menu className={`mb-1 h-5 w-5 ${open ? "text-cyan-200" : ""}`} />
              Меню
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
