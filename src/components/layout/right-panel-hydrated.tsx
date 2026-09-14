"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isProfilePath,
  shouldShowDefaultRightPanel,
  shouldShowRightPanel,
} from "@/lib/sidebar-panel-paths";
import { useLocale } from "@/components/providers/locale-provider";
import {
  RightPanelContent,
  RightPanelSkeleton,
  type SidebarPanelData,
} from "@/components/layout/right-panel-content";
import { ProfileRightPanel } from "@/components/layout/profile-right-panel";

/** 서버 prefetch + 클라이언트 네비게이션 시 sidebar fetch */
export function RightPanelHydrated({
  initialData,
  countryCode: initialCountryCode,
}: {
  initialData: SidebarPanelData | null;
  countryCode: string;
}) {
  const pathname = usePathname() ?? "/";
  const show = shouldShowRightPanel(pathname);
  const showDefault = shouldShowDefaultRightPanel(pathname);
  const { countryCode } = useLocale();
  const [data, setData] = useState<SidebarPanelData | null>(initialData);
  const skippedInitialSidebarFetch = useRef(false);
  const initialSponsorRef = useRef(initialData?.sponsorEvent ?? null);
  initialSponsorRef.current = initialData?.sponsorEvent ?? null;

  useEffect(() => {
    if (!showDefault) {
      setData(null);
      skippedInitialSidebarFetch.current = false;
      return;
    }

    const country = countryCode || initialCountryCode;
    if (
      !skippedInitialSidebarFetch.current &&
      initialData &&
      country === initialCountryCode
    ) {
      skippedInitialSidebarFetch.current = true;
      return;
    }
    skippedInitialSidebarFetch.current = true;

    let cancelled = false;
    const ac = new AbortController();

    void (async () => {
      try {
        const params = new URLSearchParams({ country });
        const res = await fetch(`/api/sidebar?${params.toString()}`, { signal: ac.signal });
        const body = await res.json();
        if (cancelled || !body.ok) return;
        setData((prev) => ({
          tips: body.tips ?? [],
          sidebarAds: body.sidebarAds ?? [],
          eventPins: body.eventPins ?? [],
          sponsorEvent: prev?.sponsorEvent ?? initialSponsorRef.current,
        }));
      } catch {
        if (!cancelled) {
          setData((prev) =>
            prev ?? { tips: [], sidebarAds: [], eventPins: [], sponsorEvent: null }
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [showDefault, countryCode, initialCountryCode]);

  if (!show) return null;
  if (isProfilePath(pathname)) return <ProfileRightPanel />;
  if (!data) return <RightPanelSkeleton />;
  return <RightPanelContent {...data} />;
}
