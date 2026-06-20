"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAptPath } from "@/lib/apt-route";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { useLocale } from "@/components/providers/locale-provider";

/** 사이드바 APT — 전용 페이지는 /apt */
export function AptNavSection({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  const sectionActive = isAptPath(pathname);

  return (
    <Link
      href={DEFAULT_LANDING_PATH}
      onClick={onNavigate}
      className={cn("sidebar-block", sectionActive && "sidebar-block-active")}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 border-2",
          sectionActive
            ? "bg-folk-terracotta text-white border-folk-cobalt/40 shadow-folk-sm"
            : "bg-folk-cream border-folk-cobalt/15 text-folk-cobalt"
        )}
      >
        <Building2 className="h-4 w-4" />
      </span>
      <span className="truncate font-semibold">{t("nav.apt")}</span>
    </Link>
  );
}
