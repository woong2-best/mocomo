"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-xl bg-muted" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "h-9 w-9 rounded-xl border border-border flex items-center justify-center transition-all duration-150",
        "bg-card hover:bg-muted active:scale-95 shadow-sm"
      )}
      aria-label={isDark ? "라이트 모드" : "다크 모드"}
    >
      {isDark ? <Moon className="h-4 w-4 text-slate-300" /> : <Sun className="h-4 w-4 text-amber-500" />}
    </button>
  );
}
