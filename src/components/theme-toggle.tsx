"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(hasDarkClass);

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  function setMode(dark: boolean) {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-black/20 p-1 text-xs text-muted-foreground">
        <div className="h-6 w-full animate-pulse rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div className="flex items-center rounded-lg bg-black/25 p-1 border border-white/5 text-xs">
      <button
        type="button"
        onClick={() => setMode(false)}
        className={`flex flex-1 items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium transition-all ${
          !isDark
            ? "bg-white text-slate-900 shadow-sm font-semibold"
            : "text-slate-400 hover:text-slate-200"
        }`}
        title="Modo Claro"
      >
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>Claro</span>
      </button>

      <button
        type="button"
        onClick={() => setMode(true)}
        className={`flex flex-1 items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium transition-all ${
          isDark
            ? "bg-slate-800 text-white shadow-sm font-semibold border border-white/10"
            : "text-slate-400 hover:text-slate-200"
        }`}
        title="Modo Oscuro"
      >
        <Moon className="h-3.5 w-3.5 text-blue-400" />
        <span>Oscuro</span>
      </button>
    </div>
  );
}
