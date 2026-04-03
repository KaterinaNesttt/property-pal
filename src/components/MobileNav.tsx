import { Home, Building2, CreditCard, Users, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", icon: Home, label: "Головна" },
  { to: "/properties", icon: Building2, label: "Об'єкти" },
  { to: "/payments", icon: CreditCard, label: "Платежі" },
  { to: "/tenants", icon: Users, label: "Орендарі" },
  { to: "/analytics", icon: BarChart3, label: "Аналітика" },
];

const MobileNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 min-w-[56px] ${
                isActive
                  ? "text-primary glow-text"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
