"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Send, Store, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { DEFAULT_LANDING_PATH, isCommunityFeedPath } from "@/lib/site-routes";
import { isUsedDetailPath } from "@/lib/mobile-shell";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { navIconTap, springSnappy } from "@/lib/motion-presets";
import { FloatingTabNavPlaceholder } from "@/components/auth/auth-chrome-placeholder";
import { useAuthReady } from "@/hooks/use-auth-ready";

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
    match: (p) => isCommunityFeedPath(p),
  },
  {
    href: "/market",
    icon: Store,
    labelKey: "nav.market",
    match: (p) =>
      p === "/market" ||
      (p.startsWith("/market/") && !isUsedDetailPath(p)),
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
    match: (p) => isCommunityFeedPath(p),
  },
  {
    href: "/market",
    icon: Store,
    labelKey: "nav.market",
    match: (p) => p === "/market" || (p.startsWith("/market/") && !isUsedDetailPath(p)),
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
  const { session, pending, authenticated } = useAuthReady();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();

  if (pending && !session?.user) {
    return <FloatingTabNavPlaceholder className={className} />;
  }

  const tabs = authenticated ? signedInTabs : guestTabs;

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn("floating-tab-nav-shell lg:hidden", className)}
    >
      <motion.div
        className="floating-tab-nav-pill"
        initial={false}
      >
        <div className="floating-tab-nav-row">
          {tabs.map(({ href, icon: Icon, labelKey, match }) => {
            const active = match(pathname);
            const guestMessages = !authenticated && href === "/auth/signin";
            const linkHref =
              guestMessages ? `/auth/signin?callbackUrl=${encodeURIComponent("/messages")}` : href;

            return (
              <PrefetchLink
                key={href}
                href={linkHref}
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
              </PrefetchLink>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
