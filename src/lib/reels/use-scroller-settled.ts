"use client";

import { useEffect, useState, type RefObject } from "react";
import { REELS_SCROLL_SETTLE_MS } from "@/lib/reels/constants";

function reelsScrollersFrom(node: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let el: HTMLElement | null = node;
  while (el) {
    if (el.dataset.reelsScroller != null) out.push(el);
    el = el.parentElement;
  }
  return out;
}

/**
 * True when every ancestor marked `[data-reels-scroller]` has stopped scrolling.
 * Starts true so the opening reel can attach immediately.
 *
 * Vertical feed fling and horizontal in-post paging are tracked separately so
 * one axis's `scrollend` cannot mark the other as settled.
 */
export function useReelsScrollerSettled(
  nodeRef: RefObject<HTMLElement | null>
): boolean {
  const [settled, setSettled] = useState(true);

  useEffect(() => {
    const node = nodeRef.current;
    const scrollers = reelsScrollersFrom(node);
    if (scrollers.length === 0) return;

    const moving = new Set<HTMLElement>();
    const timers = new Map<HTMLElement, number>();
    const publish = () => setSettled(moving.size === 0);

    const onScroll = (scroller: HTMLElement) => {
      moving.add(scroller);
      publish();
      const prev = timers.get(scroller);
      if (prev != null) window.clearTimeout(prev);
      timers.set(
        scroller,
        window.setTimeout(() => {
          timers.delete(scroller);
          moving.delete(scroller);
          publish();
        }, REELS_SCROLL_SETTLE_MS)
      );
    };

    const onScrollEnd = (scroller: HTMLElement) => {
      const prev = timers.get(scroller);
      if (prev != null) window.clearTimeout(prev);
      timers.delete(scroller);
      moving.delete(scroller);
      publish();
    };

    const listeners = scrollers.map((scroller) => {
      const scroll = () => onScroll(scroller);
      const scrollEnd = () => onScrollEnd(scroller);
      scroller.addEventListener("scroll", scroll, { passive: true });
      scroller.addEventListener("scrollend", scrollEnd);
      return { scroller, scroll, scrollEnd };
    });

    return () => {
      for (const delay of timers.values()) window.clearTimeout(delay);
      timers.clear();
      moving.clear();
      for (const { scroller, scroll, scrollEnd } of listeners) {
        scroller.removeEventListener("scroll", scroll);
        scroller.removeEventListener("scrollend", scrollEnd);
      }
    };
  }, [nodeRef]);

  return settled;
}
