"use client";

import { MapPin, ExternalLink } from "lucide-react";
import { usedMapSearchUrl } from "@/lib/used-market";

export function UsedMeetLocation({
  region,
  meetPlace,
}: {
  region: string;
  meetPlace?: string | null;
}) {
  const label = meetPlace?.trim() || region;
  const mapUrl = usedMapSearchUrl(region, meetPlace);

  return (
    <section className="space-y-2">
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between text-sm font-medium hover:text-primary"
      >
        <span className="flex items-center gap-1 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">거래 희망 장소 {label}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-border bg-muted/30 relative group"
      >
        <div className="aspect-[2/1] max-h-40 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
          <div className="text-center px-4">
            <MapPin className="h-8 w-8 mx-auto text-primary/70 mb-1" />
            <p className="text-xs text-muted-foreground">{region}</p>
            {meetPlace && <p className="text-sm font-medium mt-0.5">{meetPlace}</p>}
          </div>
        </div>
        <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-md bg-background/90 border">
          지도 보기
        </span>
      </a>
      <p className="text-xs text-muted-foreground">
        {region} 인근에서 직거래할 수 있어요 · 탭하면 카카오맵에서 위치를 확인합니다
      </p>
    </section>
  );
}
