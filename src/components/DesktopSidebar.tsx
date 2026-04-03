import { Home, Building2, CreditCard, Users, BarChart3, Gauge, FileText, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";

const navGroups = [
  {
    label: "Меню",
    items: [
      { to: "/", icon: Home, label: "Dashboard" },
      { to: "/properties", icon: Building2, label: "Нерухомість" },
      { to: "/tenants", icon: Users, label: "Орендарі" },
      { to: "/payments", icon: CreditCard, label: "Платежі" },
    ],
  },
  {
    label: "Інструменти",
    items: [
      { to: "/meters", icon: Gauge, label: "Лічильники" },
      { to: "/analytics", icon: BarChart3, label: "Аналітика" },
      { to: "/invoices", icon: FileText, label: "Накладні" },
      { to: "/settings", icon: Settings, label: "Налаштування" },
    ],
  },
];

const DesktopSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 glass-nav border-r border-border transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-foreground tracking-tight animate-fade-in">
            RentFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? "bg-primary/10 text-primary glow-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium animate-fade-in">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default DesktopSidebar;
