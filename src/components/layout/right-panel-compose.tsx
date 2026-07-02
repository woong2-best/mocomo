"use client";

import { PenSquare } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { useLocale } from "@/components/providers/locale-provider";

/** PC·노트북 — 오른쪽 패널 상단 글쓰기 */
export function RightPanelComposeButton() {
  const { t } = useLocale();

  return (
    <ComposeOpenButton className="flex w-full items-center justify-center gap-2 rounded-2xl bg-folk-terracotta py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-folk-terracotta-dark active:scale-[0.98]">
      <PenSquare className="h-4 w-4 shrink-0" />
      {t("nav.compose")}
    </ComposeOpenButton>
  );
}
