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
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-y-0 left-0 right-auto top-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-[min(100vw-3rem,20rem)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-r p-0 [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-3 pt-safe shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <span className="h-8 w-8 rounded-lg border border-border bg-white flex items-center justify-center p-0.5">
              <BrandLogo size={28} />
            </span>
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
        <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1 pb-nav pb-safe">
          {items.map(({ href, icon: Icon, labelKey }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
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
