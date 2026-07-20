"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FLASH_POST_STORAGE_KEY } from "@/lib/published-toast-types";

/** Toast에서 게시글 상세로 이동했을 때 약 1초 flash highlight */
export function PostFlashHighlight({
  postId,
  children,
  className,
}: {
  postId: string;
  children: ReactNode;
  className?: string;
}) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(FLASH_POST_STORAGE_KEY);
    } catch {
      return;
    }
    if (stored !== postId) return;
    try {
      sessionStorage.removeItem(FLASH_POST_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setFlash(true);
    const el = document.getElementById(`post-flash-${postId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = window.setTimeout(() => setFlash(false), 1100);
    return () => window.clearTimeout(t);
  }, [postId]);

  return (
    <div
      id={`post-flash-${postId}`}
      className={cn(
        "rounded-2xl transition-[box-shadow,background-color] duration-300",
        flash && "bg-folk-cobalt/10 shadow-[0_0_0_2px_hsl(var(--folk-cobalt)/0.35)]",
        className
      )}
    >
      {children}
    </div>
  );
}
