import { Home, Building2, CreditCard, Users, BarChart3, Gauge, FileText, Settings, Menu, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import lg from "@/assets/234.jpg";

const allNavItems = [
  { to: "/", icon: Home, label: "Головна" },
  { to: "/properties", icon: Building2, label: "Нерухомість" },
  { to: "/tenants", icon: Users, label: "Орендарі" },
  { to: "/payments", icon: CreditCard, label: "Платежі" },
  { to: "/meters", icon: Gauge, label: "Лічильники" },
  { to: "/analytics", icon: BarChart3, label: "Аналітика" },
  { to: "/invoices", icon: FileText, label: "Накладні" },
  { to: "/settings", icon: Settings, label: "Налаштування" },
];

const bottomNavItems = [
  { to: "/", icon: Home, label: "Головна" },
  { to: "/properties", icon: Building2, label: "Об'єкти" },
  { to: "/payments", icon: CreditCard, label: "Платежі" },
  { to: "/tenants", icon: Users, label: "Орендарі" },
];

const MobileNav = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar Navigation - lg screens */}
      <aside className="hidden lg:flex flex-col w-[240px] h-screen sticky top-0 glass-nav border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-0 px-4 h-16 border-b border-border text-accent">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-accent">
            <img src={lg} alt="Logo" className="w-8 h-8 object-cover" />
          </div>
          <span className="font-semibold text-accent tracking-tight ml-1">obka</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Top Header with Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 glass-nav border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-accent">
            <img src={lg} alt="Logo" className="w-8 h-8 object-cover" />
          </div>
          <span className="font-semibold text-accent tracking-tight ml-1">obka</span>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 20 }}
              className="lg:hidden fixed inset-0 top-16 left-0 w-[280px] glass-nav border-r border-border z-40"
            >
              <nav className="flex flex-col py-4 px-3 space-y-2 h-full overflow-y-auto">
                {allNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 top-16 bg-black/50 z-30"
            />
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative max-w-md mx-auto"
        >
          {/* Glass morphism navigation bar */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5" />
            
            <div className="relative px-2 py-3">
              <div className="flex items-center justify-between">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="relative flex flex-col items-center justify-center w-14 h-14 group"
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20"
                          transition={{ type: "spring", damping: 20 }}
                        />
                      )}

                      <div className="relative z-10 flex flex-col items-center gap-0.5">
                        <Icon
                          className={`w-5 h-5 transition-colors ${
                            isActive ? 'text-white' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-medium transition-colors ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>

                      {/* Hover glow */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/5 transition-colors" />
                      )}
                    </NavLink>
                  );
                })}

                {/* Burger Button */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="relative flex flex-col items-center justify-center w-14 h-14 group"
                >
                  <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/5 transition-colors" />
                  <div className="relative z-10 flex flex-col items-center gap-0.5">
                    {isOpen ? (
                      <X className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Menu className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-[9px] font-medium text-gray-500">Ще</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default MobileNav;
