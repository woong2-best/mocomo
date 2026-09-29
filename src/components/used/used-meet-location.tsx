"use client";

import dynamic from "next/dynamic";
import type { MeetMapPayload } from "@/lib/maps/types";

const UsedMeetMapCard = dynamic(
  () => import("@/components/used/used-meet-map-card").then((m) => m.UsedMeetMapCard),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] w-full animate-pulse rounded-xl border border-border/60 bg-muted/40" />
    ),
  }
);

export function UsedMeetLocation({
  map,
  region,
  meetPlace,
}: {
  map: MeetMapPayload | null;
  region?: string | null;
  meetPlace?: string | null;
}) {
  if (!map) return null;

  return (
    <section>
      <UsedMeetMapCard map={map} region={region} meetPlace={meetPlace} />
    </section>
  );
}
