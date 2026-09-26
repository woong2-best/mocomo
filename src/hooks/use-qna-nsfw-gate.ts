"use client";

import { useCallback, useState } from "react";
import { checkLiveR18Access } from "@/actions/live-r18-access";
import { isQnaNsfwCategoryId } from "@/lib/qna-nsfw-category";

/** BirthDate gate for QnA NSFW tab / create chip (same rules as R-18 live). */
export function useQnaNsfwGate() {
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const ensureNsfwAccess = useCallback(async (): Promise<boolean> => {
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
      if (!isQnaNsfwCategoryId(category)) return true;
      return ensureNsfwAccess();
    },
    [ensureNsfwAccess]
  );

  return {
    blockedOpen,
    setBlockedOpen,
    checking,
    ensureNsfwAccess,
    guardCategoryNav,
  };
}
