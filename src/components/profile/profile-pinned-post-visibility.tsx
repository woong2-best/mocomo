"use client";

import { useEffect, useState, type ReactNode } from "react";
import { subscribePostDeleted } from "@/lib/post-deleted-sync";

/** Hides pinned profile card immediately after optimistic delete. */
export function ProfilePinnedPostVisibility({
  postId,
  children,
}: {
  postId: string;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    return subscribePostDeleted((id) => {
      if (id === postId) setHidden(true);
    });
  }, [postId]);

  if (hidden) return null;
  return <>{children}</>;
}
