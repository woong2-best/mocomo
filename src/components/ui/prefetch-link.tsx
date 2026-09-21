"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type TouchEvent,
} from "react";

const HOVER_DELAY_MS = 120;

function hrefToPrefetchPath(href: ComponentProps<typeof Link>["href"]): string {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "";
  const search = href.search ?? "";
  return `${path}${search}`;
}

/** Viewport prefetch off — prefetch only when the user aims at the link. */
export function PrefetchLink({
  href,
  prefetch = false,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  ...rest
}: ComponentProps<typeof Link>) {
  const router = useRouter();
  const timerRef = useRef(0);

  const prefetchNow = useCallback(() => {
    const path = hrefToPrefetchPath(href);
    if (!path || path.startsWith("#") || path.startsWith("mailto:") || path.startsWith("tel:")) {
      return;
    }
    try {
      void router.prefetch(path);
    } catch {
      /* ignore */
    }
  }, [href, router]);

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onMouseEnter?.(event);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(prefetchNow, HOVER_DELAY_MS);
    },
    [onMouseEnter, prefetchNow]
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onMouseLeave?.(event);
      window.clearTimeout(timerRef.current);
    },
    [onMouseLeave]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLAnchorElement>) => {
      onTouchStart?.(event);
      prefetchNow();
    },
    [onTouchStart, prefetchNow]
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      {...rest}
    />
  );
}

export function useSpeculativePrefetch(href: string) {
  const router = useRouter();
  const timerRef = useRef(0);

  const prefetchNow = useCallback(() => {
    if (!href || href.startsWith("#")) return;
    try {
      void router.prefetch(href);
    } catch {
      /* ignore */
    }
  }, [href, router]);

  return {
    onMouseEnter: () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(prefetchNow, HOVER_DELAY_MS);
    },
    onMouseLeave: () => {
      window.clearTimeout(timerRef.current);
    },
    onTouchStart: prefetchNow,
  };
}
