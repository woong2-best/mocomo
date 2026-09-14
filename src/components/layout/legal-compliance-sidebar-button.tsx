"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { useLegalCompliance } from "@/components/providers/legal-compliance-provider";
import { cn } from "@/lib/utils";

export function LegalComplianceSidebarButton({ className }: { className?: string }) {
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
      {t("sidebar.legalCompliance")}
    </button>
  );
}
