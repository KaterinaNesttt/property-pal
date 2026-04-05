import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Building2, CreditCard, FileText, Gauge, Home, ListTodo, Menu, Settings, Users, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Payment, Property, Task } from "@/lib/types";

const mainItems = [
  { to: "/", icon: Home, label: "Головна" },
  { to: "/properties", icon: Building2, label: "Об'єкти", badgeKey: "properties" as const },
  { to: "/payments", icon: CreditCard, label: "Оплати" },
  { to: "/tasks", icon: ListTodo, label: "Задачі", badgeKey: "tasks" as const },
];

const extraItems = [
  { to: "/tenants", icon: Users, label: "Орендарі" },
  { to: "/meters", icon: Gauge, label: "Лічильники" },
  { to: "/analytics", icon: BarChart3, label: "Аналітика" },
  { to: "/invoices", icon: FileText, label: "Рахунки" },
  { to: "/settings", icon: Settings, label: "Налаштування" },
];

const MobileNav = () => {
  const location = useLocation();
  const { token, user, preferences } = useAuth();
  const [open, setOpen] = useState(false);

  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: () => api.get<Property[]>("/api/properties", token),
    enabled: Boolean(token),
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks", token),
    enabled: Boolean(token),
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<Payment[]>("/api/payments", token),
    enabled: Boolean(token),
  });

  const counts = useMemo(
    () => ({
      properties: (propertiesQuery.data ?? []).filter((property) => property.status === "free").length,
      tasks: (tasksQuery.data ?? []).filter((task) => task.status !== "done").length,
      invoices: (paymentsQuery.data ?? []).filter((payment) => payment.status !== "paid").length,
    }),
    [paymentsQuery.data, propertiesQuery.data, tasksQuery.data],
  );

  const showBadge = (key: "properties" | "tasks" | "invoices") =>
    preferences.badgePreferences.all && preferences.badgePreferences[key];

  const avatarStyle = {
    transform: `translate(${preferences.avatarX}px, ${preferences.avatarY}px) scale(${preferences.avatarScale})`,
    transformOrigin: "center center",
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              aria-label="Закрити меню"
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              type="button"
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-[min(92vw,360px)] flex-col border-l border-white/10 bg-black/88 p-5 shadow-2xl backdrop-blur-2xl"
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-black/30">
                    {user?.avatar ? (
                      <img
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        src={user.avatar}
                        style={avatarStyle}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                        {user?.full_name?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Jopka</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{user?.full_name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {user?.role === "superadmin" ? "Superadmin" : user?.role === "owner" ? "Owner" : "Tenant"}
                    </p>
                  </div>
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
                          ? "border-btns bg-accent/50 text-white"
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
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-4 md:px-6 md:pb-6">
        <motion.div
          className="pointer-events-auto relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-white/10 to-white/5 p-2 shadow-2xl shadow-[0_25px_80px_rgba(2,6,23,0.55)] backdrop-blur-2xl"
          initial={false}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5" />
          <div className="grid grid-cols-5 gap-2">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              const badgeValue = item.badgeKey ? counts[item.badgeKey] : 0;
              const badgeVisible = item.badgeKey ? showBadge(item.badgeKey) && badgeValue > 0 : false;
              return (
                <NavLink
                  key={item.to}
                  className="group relative flex min-h-[68px] flex-col items-center justify-center rounded-[1.35rem] px-2 py-3 text-center text-[11px] font-medium md:text-xs"
                  to={item.to}
                >
                  {active ? (
                    <motion.div
                      layoutId="mobile-nav-active-tab"
                      className="absolute inset-0 rounded-[1.35rem] border border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm"
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    />
                  ) : (
                    <div className="absolute inset-0 rounded-[1.35rem] bg-white/0 transition-colors duration-200 group-hover:bg-white/5" />
                  )}
                  {badgeVisible ? (
                    <span className="absolute right-2 top-2 z-20 inline-flex min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1.5 text-[10px] font-semibold text-slate-950">
                      {badgeValue}
                    </span>
                  ) : null}
                  <motion.div
                    className={`relative z-10 flex flex-col items-center justify-center gap-1 transition-colors ${
                      active ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-white" : ""}`} />
                    <span>{item.label}</span>
                  </motion.div>
                </NavLink>
              );
            })}

            <button
              className="group relative flex min-h-[68px] flex-col items-center justify-center rounded-[1.35rem] px-2 py-3 text-center text-[11px] font-medium md:text-xs"
              onClick={() => setOpen(true)}
              type="button"
            >
              {open ? (
                <motion.div
                  layoutId="mobile-nav-active-tab"
                  className="absolute inset-0 rounded-[1.35rem] border border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm"
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                />
              ) : (
                <div className="absolute inset-0 rounded-[1.35rem] bg-white/0 transition-colors duration-200 group-hover:bg-white/5" />
              )}
              <motion.div
                className={`relative z-10 flex flex-col items-center justify-center gap-1 transition-colors ${
                  open ? "text-white" : "text-slate-400 group-hover:text-white"
                }`}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.96 }}
              >
                <Menu className={`h-5 w-5 ${open ? "text-white" : ""}`} />
                <span>Меню</span>
              </motion.div>
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default MobileNav;
