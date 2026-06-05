"use client";

import { PenSquare } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";

/** PC·노트북 — 오른쪽 패널 상단 글쓰기 */
export function RightPanelComposeButton() {
  return (
    <ComposeOpenButton className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e53935] py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#c62828] active:scale-[0.98]">
      <PenSquare className="h-4 w-4 shrink-0" />
      글쓰기
    </ComposeOpenButton>
  );
}
