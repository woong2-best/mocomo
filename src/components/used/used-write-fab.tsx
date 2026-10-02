"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export function UsedWriteFab() {
  const { locale , t } = useLocale();
  const { isNativeApp } = useClientPlatform();

  return (
    <Button
      asChild
      variant="secondary"
      size="icon"
      className={cn(
        "fixed right-[18px] z-50 h-14 w-14 rounded-full border-0 bg-folk-terracotta text-white shadow-[0_4px_10px_rgba(0,0,0,0.28)] text-[30px] font-light hover:bg-folk-terracotta/90",
        "bottom-[calc(var(--mobile-nav-h)+0.75rem)] md:bottom-6"
      )}
      aria-label={t("ui.new_listing")}
    >
      <Link href="/market/new" prefetch>
        +
      </Link>
    </Button>
  );
}
