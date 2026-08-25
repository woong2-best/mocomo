"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mainNavItems } from "@/lib/nav-items";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { isNavItemActive, resolveMyPageHref } from "@/lib/nav-active";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { springSnappy } from "@/lib/motion-presets";

type MobileDrawerNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PANEL_WIDTH = "min(86vw, 360px)";

export function MobileDrawerNav({ open, onOpenChange }: MobileDrawerNavProps) {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const ownProfilePath = session?.user?.username ? `/u/${session.user.username}` : null;

  const items = (isLiveFeatureEnabled()
    ? mainNavItems
    : mainNavItems.filter((item) => !isLiveNavHref(item.href))
  ).map((item) =>
    item.href === "/my-page"
      ? { ...item, href: resolveMyPageHref(session?.user?.username) }
      : item
  );
  const navHrefs = items.map((item) => item.href);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const drawer =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="메뉴 닫기"
              className="mobile-drawer-scrim"
              initial={reduced ? false : { opacity: 0 }}
              animate={reduced ? undefined : { opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.22 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="사이드 메뉴"
              className="mobile-drawer-panel"
              style={{ width: PANEL_WIDTH }}
              initial={reduced ? false : { x: "-100%" }}
              animate={reduced ? undefined : { x: 0 }}
              exit={reduced ? undefined : { x: "-100%" }}
              transition={springSnappy}
            >
              <div className="mobile-drawer-header">
                <div className="flex min-w-0 items-center gap-2">
                  <BrandLogo size={28} />
                  <span className="truncate font-display text-base font-bold text-[hsl(var(--folk-cobalt))] dark:text-[hsl(var(--folk-cream))]">
                    {BRAND.name}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={() => onOpenChange(false)}
                  aria-label="메뉴 닫기"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="mobile-drawer-nav" aria-label="주요 메뉴">
                {items.map(({ href, icon: Icon, labelKey }) => {
                  const active = isNavItemActive(pathname, href, navHrefs, ownProfilePath);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => onOpenChange(false)}
                      className={cn("mobile-drawer-item", active && "mobile-drawer-item-active")}
                    >
                      <Icon className="h-[22px] w-[22px] shrink-0 text-muted-foreground" strokeWidth={2} />
                      <span className="truncate">{t(labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>,
      document.body
    );

  return drawer;
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="lg:hidden h-10 w-10 rounded-full shrink-0"
      onClick={onClick}
      aria-label="메뉴 보기"
    >
      <Menu className="h-6 w-6" strokeWidth={2} />
      <span className="sr-only">메뉴</span>
    </Button>
  );
}
