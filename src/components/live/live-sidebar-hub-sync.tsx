"use client";

import { useEffect } from "react";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";

/** /live 허브 진입 시 왼쪽 패널 자동 접기 */
export function LiveSidebarHubSync() {
  const { setOpen } = useSidebarToggle();

  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  return null;
}
