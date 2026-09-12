"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, PenSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompose } from "@/components/compose/compose-provider";
import { mainNavItems } from "@/lib/nav-items";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { isNavItemActive, resolveMyPageHref } from "@/lib/nav-active";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { springSnappy } from "@/lib/motion-presets";

type MobileDrawerNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Narrow drawer — bg art is 363×1024 crop; panel clips the right, never stretches the image. */
const PANEL_WIDTH = "min(58vw, 14.5rem)";

export function MobileDrawerNav({ open, onOpenChange }: MobileDrawerNavProps) {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const { openCompose } = useCompose();
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
              className="mobile-drawer-panel folk-sidebar-panel"
              style={{ width: PANEL_WIDTH }}
              initial={reduced ? false : { x: "-100%" }}
              animate={reduced ? undefined : { x: 0 }}
              exit={reduced ? undefined : { x: "-100%" }}
              transition={springSnappy}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mobile-drawer-close"
                onClick={() => onOpenChange(false)}
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="folk-sidebar-nav-stack mobile-drawer-nav-stack">
                <nav className="folk-sidebar-nav" aria-label="주요 메뉴">
                  {items.map(({ href, icon: Icon, labelKey }) => {
                    const active = isNavItemActive(pathname, href, navHrefs, ownProfilePath);

                    return (
                      <Link
                        key={href}
                        href={href}
                        prefetch={href === "/live" || href === "/messages" ? false : undefined}
                        onClick={() => onOpenChange(false)}
                        className={cn("sidebar-block drop-shadow-sm", active && "sidebar-block-active")}
                      >
                        <span
                          className={cn(
                            "sidebar-block-icon flex items-center justify-center rounded-lg shrink-0 border-2",
                            active && "sidebar-block-icon-active"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{t(labelKey)}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="folk-sidebar-compose">
                  <button
                    type="button"
                    className="folk-sidebar-compose-btn"
                    onClick={() => {
                      onOpenChange(false);
                      openCompose();
                    }}
                  >
                    <PenSquare className="h-4 w-4 shrink-0" />
                    {t("nav.compose")}
                  </button>
                </div>
              </div>
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
