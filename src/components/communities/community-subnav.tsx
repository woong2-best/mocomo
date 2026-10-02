"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CommunitySubnav({
  slug,
  showSettings = false,
}: {
  slug: string;
  showSettings?: boolean;
}) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const tabs = [
    { href: base, label: t("lib.flower.sq7xo0") },
    { href: `${base}/members`, label: t("lib.community-server.swqlc") },
    ...(showSettings ? [{ href: `${base}/settings`, label: t("settings.title") }] : []),
  ];

  return (
    <nav className="flex gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const active =
          tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium",
              active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
