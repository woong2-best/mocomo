"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { useLocale } from "@/components/providers/locale-provider";
import {
  RightPanelContent,
  RightPanelSkeleton,
  type SidebarPanelData,
} from "@/components/layout/right-panel-content";

/** 서버 prefetch + 클라이언트 네비게이션 시 lazy fetch */
export function RightPanelHydrated({
  initialData,
  countryCode: initialCountryCode,
}: {
  initialData: SidebarPanelData | null;
  countryCode: string;
}) {
  const pathname = usePathname();
  const show = shouldShowRightPanel(pathname);
  const { countryCode } = useLocale();
  const [data, setData] = useState<SidebarPanelData | null>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (data) return;

    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/sidebar?country=${encodeURIComponent(countryCode || initialCountryCode)}`,
          { signal: ac.signal }
        );
        const body = await res.json();
        if (cancelled || !body.ok) return;
        setData({
          animes: body.animes ?? [],
          tips: body.tips ?? [],
          sidebarAds: body.sidebarAds ?? [],
          eventPins: body.eventPins ?? [],
        });
      } catch {
        if (!cancelled) {
          setData({ animes: [], tips: [], sidebarAds: [], eventPins: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [show, data, countryCode, initialCountryCode]);

  if (!show) return null;
  if (!data) return loading ? <RightPanelSkeleton /> : null;
  return <RightPanelContent {...data} />;
}
