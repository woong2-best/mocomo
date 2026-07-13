"use client";

import { useSession } from "next-auth/react";
import {
  ACCOUNT_SUSPENDED_LIKE_MESSAGE,
  ACCOUNT_SUSPENDED_POST_MESSAGE,
  ACCOUNT_SUSPENDED_WRITE_MESSAGE,
} from "@/lib/account-status";

export function useSuspendedAccount() {
  const session = useSession();
  const suspended = Boolean(session.data?.user?.isSuspendedReadOnly);

  function blockAction(kind: "post" | "like" | "default" = "default"): boolean {
    if (!suspended) return false;
    const message =
      kind === "post"
        ? ACCOUNT_SUSPENDED_POST_MESSAGE
        : kind === "like"
          ? ACCOUNT_SUSPENDED_LIKE_MESSAGE
          : ACCOUNT_SUSPENDED_WRITE_MESSAGE;
    if (typeof window !== "undefined") window.alert(message);
    return true;
  }

  return { suspended, blockAction };
}
