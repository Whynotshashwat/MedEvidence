import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutDashboard,
  Users,
  FolderOpen,
  Shield,
  UserCog,
  CornerDownLeft,
} from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: any;
  action: () => void;
  keywords: string;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback((path: string) => {
    onOpenChange(false);
    navigate(path);
  }, [navigate, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);

    const base: PaletteItem[] = [
      { id: "nav-dash", label: "Dashboard", icon: LayoutDashboard, action: () => go("/dashboard"), keywords: "home overview" },
      { id: "nav-patients", label: "Patients", icon: Users, action: () => go("/patients"), keywords: "people list" },
      { id: "nav-cases", label: "Cases", icon: FolderOpen, action: () => go("/cases"), keywords: "triage list" },
      { id: "nav-audit", label: "Audit Log", icon: Shield, action: () => go("/audit"), keywords: "trail compliance" },
      { id: "nav-users", label: "User Management", icon: UserCog, action: () => go("/users"), keywords: "admin accounts" },
    ];

    let cancelled = false;
    Promise.all([
      api.get<{ patients: { id: string; first_name: string; last_name: string; mrn: string }[] }>("/patients").catch(() => ({ patients: [] })),
      api.get<{ cases: { id: string; case_number: string; first_name: string; last_name: string }[] }>("/cases").catch(() => ({ cases: [] })),
    ]).then(([p, c]) => {
      if (cancelled) return;
      const patientItems: PaletteItem[] = p.patients.slice(0, 8).map((pt) => ({
        id: `p-${pt.id}`,
        label: `${pt.first_name} ${pt.last_name}`,
        sublabel: `Patient · ${pt.mrn}`,
        icon: Users,
        action: () => go(`/patients/${pt.id}`),
        keywords: `patient ${pt.mrn} ${pt.first_name} ${pt.last_name}`,
      }));
      const caseItems: PaletteItem[] = c.cases.slice(0, 8).map((cs) => ({
        id: `c-${cs.id}`,
        label: cs.case_number,
        sublabel: `Case · ${cs.first_name || "?"} ${cs.last_name || "?"}`,
        icon: FolderOpen,
        action: () => go(`/cases/${cs.id}`),
        keywords: `case ${cs.case_number} ${cs.first_name} ${cs.last_name}`,
      }));
      setItems([...base, ...patientItems, ...caseItems]);
    });

    return () => {
      cancelled = true;
    };
  }, [open, go]);

  const filtered = items.filter((i) =>
    i.keywords.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[active]?.action();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, active]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm animate-in fade-in-0"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="glass w-full max-w-xl animate-fade-up overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients, cases, pages..."
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                onMouseEnter={() => setActive(i)}
                onClick={item.action}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="text-xs text-muted-foreground">{item.sublabel}</span>
                )}
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
