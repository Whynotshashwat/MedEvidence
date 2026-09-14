import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Shield,
  UserCog,
  Sun,
  Moon,
  LogOut,
  Menu,
  Search,
  X,
  ShieldCheck,
} from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    const location = window.location.pathname;
    const target = location.includes("/cases") ? "cases" : "patients";
    navigate(`/${target}?search=${encodeURIComponent(q)}`);
    setSearch("");
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:inline">MedEvidence</span>
        </Link>
      </div>

      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients, cases..."
            className="pl-10 bg-muted/50 border-0"
          />
        </div>
      </form>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle dark mode">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="hidden sm:flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col">
            <span className="text-sm font-medium leading-none">{user?.full_name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 border-b bg-background p-4 lg:hidden z-50">
          <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}

function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/cases", icon: FolderOpen, label: "Cases" },
    { to: "/audit", icon: Shield, label: "Audit Log", roles: ["admin", "auditor"] },
    { to: "/users", icon: UserCog, label: "Users", roles: ["admin"] },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  return (
    <nav className={`flex flex-col gap-1 p-2 ${mobile ? "flex" : "hidden lg:flex"}`}>
      {visibleItems.map((item) => {
        const isActive = location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { Sidebar };
