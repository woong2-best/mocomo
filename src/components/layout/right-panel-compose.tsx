"use client";

import { Mailbox } from "lucide-react";
import { AptMailboxLink } from "@/components/compose/apt-mailbox-link";

/** PC·노트북 — 오른쪽 패널 상단 APT 우편함 */
export function RightPanelComposeButton() {
  return (
    <AptMailboxLink className="flex w-full items-center justify-center gap-2 rounded-2xl bg-folk-terracotta py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-folk-terracotta-dark active:scale-[0.98]">
      <Mailbox className="h-4 w-4 shrink-0" />
      우편함
    </AptMailboxLink>
  );
}
