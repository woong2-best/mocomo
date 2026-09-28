"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { useLegalCompliance } from "@/components/providers/legal-compliance-provider";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export function LegalComplianceSidebarButton({
  className,
  iconOnly,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const { t } = useLocale();
  const { isOpen, toggle } = useLegalCompliance();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      className={cn(
        "folk-sidebar-legal-btn",
        isOpen && "border-folk-terracotta/80 bg-white/15",
        className
      )}
    >
      {iconOnly ? (
        <>
          <Scale className="mx-auto h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">{t("sidebar.legalCompliance")}</span>
        </>
      ) : (
        t("sidebar.legalCompliance")
      )}
    </button>
  );
}
