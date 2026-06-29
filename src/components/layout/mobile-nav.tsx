"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Home,
  Compass,
  Mailbox,
  Radio,
  User,
  LogIn,
  Tags,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { MobileDrawerNav } from "@/components/layout/mobile-drawer-nav";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { DEFAULT_LANDING_PATH, APT_GAME_PATH } from "@/lib/site-routes";

const guestTabs: { href: string; icon: typeof Home; labelKey: MessageKey }[] = [
  { href: DEFAULT_LANDING_PATH, icon: Home, labelKey: "nav.home" },
  { href: "/discover", icon: Compass, labelKey: "nav.discover" },
  { href: "/live", icon: Radio, labelKey: "nav.live" },
  { href: "/auth/signin", icon: LogIn, labelKey: "nav.signin" },
  { href: "/auth/signup", icon: User, labelKey: "nav.signup" },
];

const userTabs: { href: string; icon: typeof Home; labelKey: MessageKey }[] = [
  { href: DEFAULT_LANDING_PATH, icon: Home, labelKey: "nav.home" },
  { href: "/used", icon: Tags, labelKey: "nav.used" },
  { href: "/apt?decor=mailbox", icon: Mailbox, labelKey: "nav.compose" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);
  const rawTabs = session?.user ? userTabs : guestTabs;
  const tabs = isLiveFeatureEnabled()
    ? rawTabs
    : rawTabs.filter((tab) => !isLiveNavHref(tab.href));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-folk-cobalt/25 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-[0_-3px_0_hsl(var(--folk-terracotta)/0.15)] pb-safe">
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
          {tabs.map(({ href, icon: Icon, labelKey }) => {
            const active =
              href.startsWith("/auth")
                ? pathname.startsWith("/auth")
                : href.startsWith("/apt")
                  ? pathname.startsWith("/apt") || pathname === APT_GAME_PATH
                  : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href.startsWith("/apt") ? buildAptMailboxUrl() : href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 px-0.5 text-[10px]",
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
                <span className="truncate max-w-full">{t(labelKey)}</span>
              </Link>
            );
          })}
          {session?.user ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 px-0.5 text-[10px]",
                moreOpen ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <LayoutGrid className="h-5 w-5 shrink-0" />
              <span className="truncate">{t("nav.more")}</span>
            </button>
          ) : null}
        </div>
      </nav>
      <MobileDrawerNav open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
