import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/ui/command-palette";

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="app-mesh min-h-screen">
      <Rail />
      <div className="pl-[76px]">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
