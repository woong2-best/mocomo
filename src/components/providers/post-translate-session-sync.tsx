"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePostTranslate } from "@/components/providers/post-translate-provider";

/** Leaf sync — do not call useSession from the root provider. */
export function PostTranslateSessionSync() {
  const sessionState = useSession();
  const { hydrateFromSession } = usePostTranslate();

  useEffect(() => {
    if (sessionState?.status !== "authenticated") return;
    hydrateFromSession(sessionState.data?.user?.postTranslateInto);
  }, [
    sessionState?.status,
    sessionState?.data?.user?.postTranslateInto,
    hydrateFromSession,
  ]);

  return null;
}
