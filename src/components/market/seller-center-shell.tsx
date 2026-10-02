"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";
import { BRAND } from "@/lib/brand";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Package,
  Settings,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

const SIDEBAR = [
  { href: "/market/seller", label: t("market.srdm5fg"), icon: Store },
  { href: "/market/sell-item", label: t("market.s1y6oi91"), icon: Package },
  { href: "/market/orders?role=seller", label: t("market.ss59pnw"), icon: Truck },
  { href: "/market/seller#settlement", label: t("market.sz397"), icon: Wallet },
  { href: "/market/seller#profile", label: t("market.s1hbsyjn"), icon: Settings },
  { href: "/legal/seller-terms", label: t("market.s20dio6"), icon: HelpCircle },
] as const;

export function SellerCenterShell({
  children,
  displayName,
  sellerCode,
}: {
  children: React.ReactNode;
  displayName: string;
  sellerCode: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] text-[#1a1a1a]">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-3 sm:px-4">
          <Link href="/market/seller" className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-serif text-[1.05rem] font-semibold tracking-tight truncate">
              {BRAND.name} marketplace
            </span>
            <span className="hidden sm:inline text-[11px] text-muted-foreground">{t("market.s1w6z9o0")}</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link
              href="/legal/seller-terms"
              className="hidden md:inline text-muted-foreground hover:text-foreground"
            >
              {t("market.s1w6vtot")}
            </Link>
            <Link
              href="/support"
              className="hidden md:inline text-muted-foreground hover:text-foreground"
            >
              {t("market.shfc4p0")}
            </Link>
            <Link
              href="/legal/seller-terms"
              className="hidden sm:inline text-muted-foreground hover:text-foreground"
            >
              {t("market.sraq50")}
            </Link>
            <button
              type="button"
              className="p-2 text-muted-foreground hover:text-foreground rounded-md"
              aria-label={t("nav.notifications")}
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/60 font-medium"
              >
                <span className="max-w-[8rem] truncate">
                  {t("market.sellerGreeting", { name: displayName })}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label={t("market.s14rg279")}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 z-50 w-64 rounded-lg border border-border bg-white shadow-lg py-1 text-sm">
                    <div className="px-3.5 py-2.5 text-xs text-muted-foreground border-b border-border/70">
                      {t("market.sellerCompanyCode")}{" "}
                      <span className="font-mono text-foreground font-medium">{sellerCode}</span>
                    </div>
                    <Link
                      href="/settings/profile"
                      className="block px-3.5 py-2.5 hover:bg-muted/50"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("market.smmqrdc")}
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-3.5 py-2.5 hover:bg-muted/50"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("auth.changePassword")}
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-3.5 py-2.5 hover:bg-muted/50"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("market.sms")}
                    </Link>
                    <Link
                      href="/market/seller#profile"
                      className="block px-3.5 py-2.5 hover:bg-muted/50 border-b border-border/70"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("market.s5o4uai")}
                    </Link>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-muted/50 text-left"
                      onClick={() => void performWebSignOut({ callbackUrl: "/market" })}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {t("menu.signOut")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0">
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-black/6 bg-white py-4">
          <nav className="px-2 space-y-0.5">
            {SIDEBAR.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/market/seller"
                  ? pathname === "/market/seller"
                  : pathname.startsWith(item.href.split("?")[0]!.split("#")[0]!);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-4 pt-6 text-[11px] text-muted-foreground space-y-2">
            <p className="font-medium text-foreground/70">{t("market.spnlabc")}</p>
            <Link href="/market" className="block hover:text-foreground">
              {MARKET_BRAND_FULL}
            </Link>
            <Link href="/" className="block hover:text-foreground">
              {t("market.mocomo_2")}
            </Link>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-3 sm:px-5 py-5 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
