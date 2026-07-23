"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { recordPostViewOnce } from "@/lib/post-view-client";

type PostViewTrackerProps = {
  postId: string;
  /** 초기 조회수 — 기록 성공 시 +1 반영용 */
  initialCount?: number;
  /** 화면에 보이면 기록 (피드). 기본: 마운트 즉시 (상세) */
  whenVisible?: boolean;
  children?: (count: number) => ReactNode;
};

/**
 * 게시물 조회 기록.
 * - 상세: whenVisible 없이 마운트 시 세션당 1회
 * - 피드: whenVisible + IntersectionObserver, 세션당 1회
 */
export function PostViewTracker({
  postId,
  initialCount = 0,
  whenVisible = false,
  children,
}: PostViewTrackerProps) {
  const [count, setCount] = useState(initialCount);
  const sent = useRef(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    sent.current = false;
  }, [postId]);

  useEffect(() => {
    if (sent.current) return;

    async function fire() {
      if (sent.current) return;
      sent.current = true;
      const ok = await recordPostViewOnce(postId);
      if (ok) setCount((c) => c + 1);
    }

    if (!whenVisible) {
      void fire();
      return;
    }

    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      void fire();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35)) {
          void fire();
          io.disconnect();
        }
      },
      { threshold: [0.35] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [postId, whenVisible]);

  if (children) {
    return (
      <span ref={rootRef} className="inline-flex items-center">
        {children(count)}
      </span>
    );
  }

  return <span ref={rootRef} className="sr-only" aria-hidden />;
}
