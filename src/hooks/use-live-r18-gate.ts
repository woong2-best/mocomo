"use client";

import { useCallback, useState } from "react";
import { checkLiveR18Access } from "@/actions/live-r18-access";
import { isR18LiveCategory } from "@/lib/live-categories";

/**
 * Client gate for R-18 live category (DB enum `LIVE`).
 * Uses profile birthDate via canViewNsfwContent (만 19세+).
 */
export function useLiveR18Gate() {
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const ensureR18Access = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      const status = await checkLiveR18Access();
      if (status.allowed) return true;
      setBlockedOpen(true);
      return false;
    } catch {
      setBlockedOpen(true);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const guardCategoryNav = useCallback(
    async (category: string | null | undefined): Promise<boolean> => {
      if (!isR18LiveCategory(category)) return true;
      return ensureR18Access();
    },
    [ensureR18Access]
  );

  return {
    blockedOpen,
    setBlockedOpen,
    checking,
    ensureR18Access,
    guardCategoryNav,
  };
}
