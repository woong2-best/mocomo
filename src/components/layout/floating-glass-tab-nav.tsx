"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Home, Send, Store, Tags, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { isUsedDetailPath } from "@/lib/mobile-shell";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { navIconTap, springSnappy } from "@/lib/motion-presets";

type TabDef = {
  href: string;
  icon: typeof Home;
  labelKey: MessageKey;
  match: (pathname: string) => boolean;
};

const signedInTabs: TabDef[] = [
  {
    href: DEFAULT_LANDING_PATH,
    icon: Home,
    labelKey: "nav.home",
    match: (p) => p === DEFAULT_LANDING_PATH || p.startsWith(`${DEFAULT_LANDING_PATH}/`),
  },
  {
    href: "/market",
    icon: Store,
    labelKey: "nav.market",
    match: (p) => p === "/market" || p.startsWith("/market/"),
  },
  {
    href: "/used",
    icon: Tags,
    labelKey: "nav.used",
    match: (p) =>
      p === "/used" ||
      (p.startsWith("/used/") && !isUsedDetailPath(p)),
  },
  {
    href: "/messages",
    icon: Send,
    labelKey: "nav.messages",
    match: (p) => p === "/messages" || p.startsWith("/messages/"),
  },
];

const guestTabs: TabDef[] = [
  {
    href: DEFAULT_LANDING_PATH,
    icon: Home,
    labelKey: "nav.home",
    match: (p) => p === DEFAULT_LANDING_PATH || p.startsWith(`${DEFAULT_LANDING_PATH}/`),
  },
  {
    href: "/market",
    icon: Store,
    labelKey: "nav.market",
    match: (p) => p === "/market" || p.startsWith("/market/"),
  },
  {
    href: "/used",
    icon: Tags,
    labelKey: "nav.used",
    match: (p) => p === "/used" || (p.startsWith("/used/") && !isUsedDetailPath(p)),
  },
  {
    href: "/auth/signin",
    icon: LogIn,
    labelKey: "nav.messages",
    match: (p) => p.startsWith("/auth"),
  },
];

type Props = {
  layoutId?: string;
  className?: string;
};

export function FloatingGlassTabNav({ layoutId = "floating-tab-glow", className }: Props) {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const tabs = session?.user ? signedInTabs : guestTabs;

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn("floating-tab-nav-shell lg:hidden", className)}
    >
      <motion.div
        className="floating-tab-nav-pill"
        initial={reduced ? false : { y: 24, opacity: 0 }}
        animate={reduced ? undefined : { y: 0, opacity: 1 }}
        transition={springSnappy}
      >
        <div className="floating-tab-nav-row">
          {tabs.map(({ href, icon: Icon, labelKey, match }) => {
            const active = match(pathname);
            const guestMessages = !session?.user && href === "/auth/signin";
            const linkHref =
              guestMessages ? `/auth/signin?callbackUrl=${encodeURIComponent("/messages")}` : href;

            return (
              <Link
                key={href}
                href={linkHref}
                prefetch={href === "/messages" ? false : undefined}
                className={cn(
                  "floating-tab-nav-item",
                  active && "floating-tab-nav-item-active"
                )}
              >
                {active && !reduced ? (
                  <motion.span
                    layoutId={layoutId}
                    className="floating-tab-nav-glow"
                    transition={springSnappy}
                  />
                ) : null}
                <motion.span
                  className="relative z-[1] flex flex-col items-center gap-0.5"
                  whileTap={reduced ? undefined : navIconTap}
                  animate={
                    reduced
                      ? undefined
                      : active
                        ? { scale: 1.04, y: -1 }
                        : { scale: 1, y: 0 }
                  }
                  transition={springSnappy}
                >
                  <Icon
                    className={cn("h-[23px] w-[23px] shrink-0", active && "text-[hsl(var(--folk-cobalt))] dark:text-[hsl(var(--folk-terracotta))]")}
                    strokeWidth={active ? 2.35 : 2}
                  />
                  <span className="floating-tab-nav-label">{t(labelKey)}</span>
                </motion.span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
