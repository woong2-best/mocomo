"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Gamepad2, Home, Sparkles, Tags, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { DiscoveryMatchBadge } from "@/components/discovery/discovery-match-badge";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { navIconTap, springSnappy } from "@/lib/motion-presets";

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

function userTabs(username: string | null): TabDef[] {
  const tabs: TabDef[] = [
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
      href: "/used",
      icon: Tags,
      labelKey: "nav.used",
      match: (p) => p === "/used" || p.startsWith("/used/"),
    },
    {
      href: "/games",
      icon: Gamepad2,
      labelKey: "nav.games",
      match: (p) => p === "/games" || p.startsWith("/games/"),
    },
  ];
  if (username) {
    tabs.push({
      href: `/u/${username}`,
      icon: User,
      labelKey: "nav.myPage",
      match: (p) => p === `/u/${username}` || p.startsWith(`/u/${username}/`),
    });
  }
  return tabs;
}

export function NativeAppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const username = session?.user?.username ?? null;
  const tabs = session?.user ? userTabs(username) : guestTabs;

  return (
    <motion.nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-md pb-safe"
      initial={reduced ? false : { y: 48, opacity: 0 }}
      animate={reduced ? undefined : { y: 0, opacity: 1 }}
      transition={springSnappy}
    >
      <div className="mx-auto flex h-[3.25rem] max-w-lg items-stretch justify-around">
        {tabs.map(({ href, icon: Icon, labelKey, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              prefetch={href === "/messages" ? false : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px]",
                active ? "text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              {active && !reduced && (
                <motion.span
                  layoutId="native-nav-pill"
                  className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-primary/10 border border-primary/20"
                  transition={springSnappy}
                />
              )}
              <motion.span
                className="relative z-[1] flex flex-col items-center gap-0.5"
                whileTap={reduced ? undefined : navIconTap}
                animate={
                  reduced
                    ? undefined
                    : active
                      ? { scale: 1.08, y: -2 }
                      : { scale: 1, y: 0 }
                }
                transition={springSnappy}
              >
                <Icon
                  className={cn("h-[22px] w-[22px] shrink-0", active && "text-primary")}
                  strokeWidth={active ? 2.5 : 2}
                />
                {href === "/discover" && <DiscoveryMatchBadge />}
                <span className="truncate max-w-full">{t(labelKey)}</span>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
