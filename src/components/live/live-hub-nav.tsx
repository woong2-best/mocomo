"use client";

import Link from "next/link";
import { Calendar, Heart, LayoutGrid } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

type LiveHubView = "explore" | "following" | "schedule";

export function LiveHubNav({ activeView }: { activeView: LiveHubView }) {
  const { t } = useLocale();

  const items: {
    key: LiveHubView;
    href: string;
    icon: typeof LayoutGrid;
    label: string;
  }[] = [
    { key: "explore", href: "/live", icon: LayoutGrid, label: t("live.sideBrowse") },
    { key: "following", href: "/live?view=following", icon: Heart, label: t("live.sideFollowing") },
    { key: "schedule", href: "/live/schedule", icon: Calendar, label: t("live.schedule") },
  ];

  return (
    <nav className="flex items-center gap-1.5 shrink-0">
      {items.map(({ key, href, icon: Icon, label }) => {
        const isActive = activeView === key;
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              isActive
                ? "border-border/80 bg-card text-foreground shadow-sm"
                : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
