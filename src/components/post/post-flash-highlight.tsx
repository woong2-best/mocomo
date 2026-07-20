"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  FLASH_POST_STORAGE_KEY,
  SCROLL_FEED_TOP_KEY,
} from "@/lib/published-toast-types";

function scrollMainToTop() {
  const main = document.getElementById("mocomo-main-scroll");
  if (main) {
    main.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Toast에서 게시글/피드로 이동했을 때 약 1초 flash highlight */
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
    let scrollTop = false;
    try {
      stored = sessionStorage.getItem(FLASH_POST_STORAGE_KEY);
      scrollTop = sessionStorage.getItem(SCROLL_FEED_TOP_KEY) === "1";
    } catch {
      return;
    }
    if (stored !== postId) return;
    try {
      sessionStorage.removeItem(FLASH_POST_STORAGE_KEY);
      if (scrollTop) sessionStorage.removeItem(SCROLL_FEED_TOP_KEY);
    } catch {
      /* ignore */
    }
    if (scrollTop) scrollMainToTop();
    setFlash(true);
    const el = document.getElementById(`post-flash-${postId}`);
    window.setTimeout(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    const t = window.setTimeout(() => setFlash(false), 1200);
    return () => window.clearTimeout(t);
  }, [postId]);

  return (
    <div
      id={`post-flash-${postId}`}
      className={cn(
        "rounded-2xl transition-[box-shadow,background-color] duration-300",
        flash && "bg-[#1D9BF0]/12 shadow-[0_0_0_2px_rgba(29,155,240,0.45)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** 피드 진입 시 toast 클릭으로 남겨 둔 스크롤 요청 처리 */
export function FeedScrollTopOnMount() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SCROLL_FEED_TOP_KEY) !== "1") return;
      sessionStorage.removeItem(SCROLL_FEED_TOP_KEY);
    } catch {
      return;
    }
    scrollMainToTop();
  }, []);
  return null;
}
