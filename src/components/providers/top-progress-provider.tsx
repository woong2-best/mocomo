"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { installTopProgressFetch, topProgress } from "@/lib/top-progress";

export function TopProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopProgressBar />
      <Suspense fallback={null}>
        <TopProgressEffects />
      </Suspense>
      {children}
    </>
  );
}

function TopProgressEffects() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const prevRouteKey = useRef(routeKey);

  useEffect(() => installTopProgressFetch(), []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      topProgress.start();
    };

    const onPopState = () => {
      topProgress.start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (prevRouteKey.current === routeKey) return;
    prevRouteKey.current = routeKey;
    // Ref-counted release — Suspense fallbacks / mutations may still hold the bar open.
    topProgress.done();
  }, [routeKey]);

  return null;
}
