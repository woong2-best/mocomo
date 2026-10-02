"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS: { href: string; label: string; soon?: boolean }[] = [
  { href: "/admin/economy", label: "Dashboard" },
  { href: "/admin/economy/flags", label: "Kill Switch" },
  { href: "/admin/economy/shop", label: "Gold Shop" },
  { href: "/admin/economy/flea", label: "Flea Event" },
  { href: "/admin/economy/config", label: "Config" },
  { href: "/admin/economy/fraud", label: "Fraud" },
  { href: "/admin/economy/fraud/rules", label: "Fraud Rules" },
  { href: "/admin/economy/logs", label: "Logs (CS)" },
  { href: "/admin/economy/backup", label: "Backup" },
  { href: "/admin/economy/canary", label: "Canary" },
  { href: "/admin/economy/health", label: "Health" },
  { href: "/admin/economy/market", label: "Market" },
  { href: "/admin/economy/notifications", label: "Notifications" },
];

export function AdminEconomyNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {SECTIONS.map((s) => {
        const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
        if (s.soon) {
          return (
            <span
              key={s.href}
              className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground"
            >
              {s.label} (준비 중)
            </span>
          );
        }
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
