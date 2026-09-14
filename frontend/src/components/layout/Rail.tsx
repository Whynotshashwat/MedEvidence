import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Shield,
  UserCog,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/cases", icon: FolderOpen, label: "Cases" },
  { to: "/audit", icon: Shield, label: "Audit Log", roles: ["admin", "superadmin", "auditor"] },
  { to: "/users", icon: UserCog, label: "Users", roles: ["admin", "superadmin"] },
];

export function Rail() {
  const location = useLocation();
  const { user } = useAuth();

  const visible = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  return (
    <aside className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <nav className="glass flex flex-col items-center gap-1.5 rounded-3xl border p-2.5 shadow-2xl">
        {visible.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200"
            >
              <span
                className={
                  isActive
                    ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary glow-primary"
                    : "flex h-12 w-12 items-center justify-center rounded-2xl text-muted-foreground transition-all duration-200 group-hover:bg-muted group-hover:text-foreground group-hover:scale-105"
                }
              >
                <item.icon className="h-5 w-5" />
              </span>
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-xl transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -left-2.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
