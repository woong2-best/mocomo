"use client";

import { useEffect, useRef } from "react";

export function PostViewTracker({ postId }: { postId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch(`/api/posts/${postId}/view`, { method: "POST" }).catch(() => {});
  }, [postId]);

  return null;
}
