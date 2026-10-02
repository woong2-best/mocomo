"use client";

import { useEffect, useState } from "react";
import { Globe2, Home, Users } from "lucide-react";
import { listPublicHomes, type PublicHomeDto } from "@/actions/apt-world";
import { cn } from "@/lib/utils";

export function AptWorldVisitorsPanel({
  lat,
  lng,
  onVisit,
  onReturnHome,
  visiting,
}: {
  lat: number;
  lng: number;
  onVisit: (home: PublicHomeDto) => void;
  onReturnHome: () => void;
  visiting: PublicHomeDto | null;
}) {
  const [homes, setHomes] = useState<PublicHomeDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const list = await listPublicHomes(lat, lng, 30);
        setHomes(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [lat, lng]);

  return (
    <div className="rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-background/95 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-[hsl(var(--folk-cobalt)/0.12)] px-3 py-2.5">
        <p className="text-xs font-bold text-folk-cobalt flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          이웃 집 방문
        </p>
        <span className="text-[10px] text-muted-foreground">{homes.length}채</span>
      </div>

      {visiting && (
        <div className="bg-folk-terracotta/10 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-folk-terracotta truncate">
            {visiting.displayName}님 집 방문 중
          </p>
          <button
            type="button"
            onClick={onReturnHome}
            className="shrink-0 rounded-lg bg-folk-cobalt px-2 py-1 text-[10px] font-bold text-white"
          >
            내 집
          </button>
        </div>
      )}

      <div className="max-h-52 overflow-y-auto p-2 space-y-1.5">
        {loading && <p className="text-xs text-muted-foreground text-center py-4">불러오는 중…</p>}
        {!loading && homes.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">현관문이 열린 이웃 집이 없습니다</p>
        )}
        {homes.map((h) => (
          <button
            key={h.userId}
            type="button"
            onClick={() => onVisit(h)}
            className={cn(
              "w-full rounded-xl border px-2.5 py-2 text-left transition-colors",
              visiting?.userId === h.userId
                ? "border-folk-terracotta bg-folk-terracotta/10"
                : "border-[hsl(var(--folk-cobalt)/0.15)] hover:bg-[hsl(var(--folk-gold)/0.08)]"
            )}
          >
            <p className="text-xs font-bold text-folk-cobalt truncate">{h.displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              <Globe2 className="h-3 w-3 shrink-0" />
              {h.regionLabel ?? h.countryCode}
              {h.distanceKm != null && <span>· {h.distanceKm.toFixed(1)}km</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">블록 {h.houseBuild.pieces?.length ?? 0}개</p>
          </button>
        ))}
      </div>

      <p className="border-t border-[hsl(var(--folk-cobalt)/0.1)] px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-1">
        <Home className="h-3 w-3" />
        도시 건물 문 클릭 → 상점·카페·오피스 실내
      </p>
    </div>
  );
}
