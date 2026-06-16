"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Home, Mail, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

type TabDef = {
  href: string;
  icon: typeof Home;
  labelKey: MessageKey;
  match: (pathname: string) => boolean;
};

const guestTabs: TabDef[] = [
  {
    href: "/",
    icon: Home,
    labelKey: "nav.home",
    match: (p) => p === "/",
  },
  {
    href: "/explore",
    icon: Search,
    labelKey: "nav.explore",
    match: (p) => p === "/explore" || p.startsWith("/explore/"),
  },
  {
    href: "/auth/signin",
    icon: User,
    labelKey: "nav.signin",
    match: (p) => p.startsWith("/auth"),
  },
];

function userTabs(username: string): TabDef[] {
  return [
    {
      href: "/",
      icon: Home,
      labelKey: "nav.home",
      match: (p) => p === "/",
    },
    {
      href: "/explore",
      icon: Search,
      labelKey: "nav.explore",
      match: (p) => p === "/explore" || p.startsWith("/explore/"),
    },
    {
      href: "/notifications",
      icon: Bell,
      labelKey: "nav.notifications",
      match: (p) => p.startsWith("/notifications"),
    },
    {
      href: "/messages",
      icon: Mail,
      labelKey: "nav.messages",
      match: (p) => p === "/messages" || p.startsWith("/messages/"),
    },
    {
      href: `/u/${username}`,
      icon: User,
      labelKey: "nav.myPage",
      match: (p) => p === `/u/${username}` || p.startsWith(`/u/${username}/`),
    },
  ];
}

export function NativeAppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const username = session?.user?.username || session?.user?.id;
  const tabs = username ? userTabs(username) : guestTabs;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-md pb-safe">
      <div className="mx-auto flex h-[3.25rem] max-w-lg items-stretch justify-around">
        {tabs.map(({ href, icon: Icon, labelKey, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              prefetch={href === "/messages" ? false : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px]",
                active ? "text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-[22px] w-[22px] shrink-0", active && "text-primary")} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate max-w-full">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
