"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function LegalComplianceSidebarButton({ className }: { className?: string }) {
  const { t } = useLocale();

  const scrollToLegalFooter = () => {
    const footer = document.getElementById("mocomo-legal-footer");
    footer?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={scrollToLegalFooter}
      className={cn("folk-sidebar-legal-btn", className)}
    >
      {t("sidebar.legalCompliance")}
    </button>
  );
}
