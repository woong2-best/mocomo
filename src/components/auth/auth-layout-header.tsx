"use client";

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { useLocale } from "@/components/providers/locale-provider";

export function AuthLayoutHeader() {
  const { t } = useLocale();

  return (
    <header className="auth-layout-marketing-header flex items-center justify-between px-4 py-3 border-b border-border bg-background/95">
      <Link href={DEFAULT_LANDING_PATH} className="font-black text-lg">
        {BRAND.name}
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/auth/signin" className="text-muted-foreground hover:text-foreground">
          {t("nav.signin")}
        </Link>
        <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
          {t("nav.signup")}
        </Link>
      </div>
    </header>
  );
}
