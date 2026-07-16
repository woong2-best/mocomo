"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import {
  RightPanelContent,
  RightPanelSkeleton,
  type SidebarPanelData,
} from "@/components/layout/right-panel-content";

/** 필요한 페이지에서만 /api/sidebar 호출 (라이브·메시지·방송방 등 제외) */
export function RightPanelLoader() {
  const pathname = usePathname();
  const show = shouldShowRightPanel(pathname);
  const [data, setData] = useState<SidebarPanelData | null>(null);

  useEffect(() => {
    if (!show) {
      setData(null);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/sidebar", { signal: ac.signal });
        const body = await res.json();
        if (cancelled || !body.ok) return;
        setData({
          trendingQueries: body.trendingQueries ?? [],
          tips: body.tips ?? [],
          sidebarAds: body.sidebarAds ?? [],
          eventPins: body.eventPins ?? [],
        });
      } catch {
        if (!cancelled) {
          setData({
            trendingQueries: [],
            tips: [],
            sidebarAds: [],
            eventPins: [],
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [show, pathname]);

  if (!show) return null;
  if (!data) return <RightPanelSkeleton />;
  return <RightPanelContent {...data} />;
}
