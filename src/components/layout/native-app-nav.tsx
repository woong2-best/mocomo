"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Gamepad2, Home, Radio, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

type TabDef = {
  href: string;
  icon: typeof Home;
  labelKey: MessageKey;
  match: (pathname: string) => boolean;
};

const guestTabs: TabDef[] = [
  {
    href: DEFAULT_LANDING_PATH,
    icon: Home,
    labelKey: "nav.home",
    match: (p) => p === DEFAULT_LANDING_PATH || p.startsWith(`${DEFAULT_LANDING_PATH}/`),
  },
  {
    href: "/discover",
    icon: Sparkles,
    labelKey: "nav.discover",
    match: (p) => p === "/discover" || p.startsWith("/discover/"),
  },
  {
    href: "/auth/signin",
    icon: User,
    labelKey: "nav.signin",
    match: (p) => p.startsWith("/auth"),
  },
];

function userTabs(username: string): TabDef[] {
  const tabs: TabDef[] = [
    {
      href: DEFAULT_LANDING_PATH,
      icon: Home,
      labelKey: "nav.home",
      match: (p) => p === DEFAULT_LANDING_PATH || p.startsWith(`${DEFAULT_LANDING_PATH}/`),
    },
    {
      href: "/games",
      icon: Gamepad2,
      labelKey: "nav.games",
      match: (p) => p === "/games" || p.startsWith("/games/"),
    },
  ];
  if (isLiveFeatureEnabled()) {
    tabs.push({
      href: "/live",
      icon: Radio,
      labelKey: "nav.live",
      match: (p) => p === "/live" || p.startsWith("/live/") || p.startsWith("/voice/"),
    });
  }
  tabs.push(
    {
      href: "/notifications",
      icon: Bell,
      labelKey: "nav.notifications",
      match: (p) => p.startsWith("/notifications"),
    },
    {
      href: `/u/${username}`,
      icon: User,
      labelKey: "nav.myPage",
      match: (p) => p === `/u/${username}` || p.startsWith(`/u/${username}/`),
    }
  );
  return tabs;
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
