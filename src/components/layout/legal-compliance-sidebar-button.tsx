"use client";

import { useLocale } from "@/components/providers/locale-provider";

export function LegalComplianceSidebarButton() {
  const { t } = useLocale();

  const scrollToLegalFooter = () => {
    const footer = document.getElementById("mocomo-legal-footer");
    footer?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      onClick={scrollToLegalFooter}
      className="w-full rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 text-[10px] font-medium leading-tight text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
    >
      {t("sidebar.legalCompliance")}
    </button>
  );
}
