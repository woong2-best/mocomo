"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mainNavItems } from "@/lib/nav-items";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { isNavItemActive } from "@/lib/nav-active";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { GamesNavSection } from "@/components/layout/games-nav-section";

type MobileDrawerNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileDrawerNav({ open, onOpenChange }: MobileDrawerNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = isLiveFeatureEnabled()
    ? mainNavItems
    : mainNavItems.filter((item) => !isLiveNavHref(item.href));
  const navHrefs = items.map((item) => item.href);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-y-0 left-0 right-auto top-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-[min(100vw-3rem,20rem)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-r-2 border-folk-cobalt/30 bg-folk-cream p-0 [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b-2 border-folk-cobalt/20 px-4 py-3 pt-safe shrink-0 bg-folk-gold/10">
          <DialogTitle className="flex items-center gap-2 text-base font-display font-bold text-folk-cobalt">
            <BrandLogo size={28} />
            {BRAND.name}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-1">
            {items.map(({ href, icon: Icon, labelKey }) => {
              const active = isNavItemActive(pathname, href, navHrefs);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "sidebar-block",
                    active && "sidebar-block-active"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t(labelKey)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="shrink-0 space-y-1 border-t-2 border-folk-cobalt/20 bg-folk-gold/10 p-3 pb-nav">
            <GamesNavSection pathname={pathname} onNavigate={() => onOpenChange(false)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="lg:hidden h-9 w-9 rounded-xl shrink-0"
      onClick={onClick}
      aria-label="메뉴 보기"
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">메뉴</span>
    </Button>
  );
}
