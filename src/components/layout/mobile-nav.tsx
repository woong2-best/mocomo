"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Compass, PenLine, Radio, MessageCircle, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const guestTabs: { href: string; icon: typeof Home; labelKey: MessageKey }[] = [
  { href: "/", icon: Home, labelKey: "nav.home" },
  { href: "/explore", icon: Compass, labelKey: "nav.explore" },
  { href: "/live", icon: Radio, labelKey: "nav.live" },
  { href: "/auth/signin", icon: LogIn, labelKey: "nav.signin" },
  { href: "/auth/signup", icon: User, labelKey: "nav.signup" },
];

const userTabs: { href: string; icon: typeof Home; labelKey: MessageKey }[] = [
  { href: "/", icon: Home, labelKey: "nav.home" },
  { href: "/explore", icon: Compass, labelKey: "nav.explore" },
  { href: "/compose", icon: PenLine, labelKey: "nav.compose" },
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages" },
  { href: "/my-page", icon: User, labelKey: "nav.myPage" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const tabs = session?.user ? userTabs : guestTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14">
        {tabs.map(({ href, icon: Icon, labelKey }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href.startsWith("/auth")
                ? pathname.startsWith("/auth")
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px]",
                active ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {t(labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
