import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sun,
  Moon,
  LogOut,
  Search,
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  Users,
  FolderOpen,
  Shield,
  UserCog,
  Command,
} from "lucide-react";

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();

  const initials =
    user?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?";

  const mobileItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/cases", icon: FolderOpen, label: "Cases" },
    { to: "/audit", icon: Shield, label: "Audit Log", roles: ["admin", "superadmin", "auditor"] },
    { to: "/users", icon: UserCog, label: "Users", roles: ["admin", "superadmin"] },
  ].filter((i) => !i.roles || i.roles.includes(user?.role || ""));

  return (
    <header className="sticky top-4 z-50 mx-4 mt-4 lg:mx-8">
      <div className="glass flex h-14 items-center justify-between gap-3 rounded-2xl border px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-500/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-base font-bold tracking-tight sm:inline">
              Med<span className="text-gradient">Evidence</span>
            </span>
          </Link>
        </div>

        <button
          onClick={onOpenPalette}
          className="hidden h-9 flex-1 items-center gap-2.5 rounded-full border-0 bg-muted/60 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex md:max-w-sm"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search patients, cases...</span>
          <kbd className="flex items-center gap-0.5 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={onOpenPalette} className="rounded-full md:hidden">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="ml-1 hidden items-center gap-2.5 sm:flex">
            <Avatar className="h-8 w-8 rounded-full ring-2 ring-primary/40">
              <AvatarFallback className="rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-[11px] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col lg:flex">
              <span className="text-xs font-semibold leading-tight">{user?.full_name}</span>
              <span className="text-[10px] capitalize text-muted-foreground">{user?.role}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="rounded-full text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {mobileNav && (
        <div className="glass mt-2 animate-fade-up rounded-2xl border p-2 shadow-xl md:hidden">
          {mobileItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileNav(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
