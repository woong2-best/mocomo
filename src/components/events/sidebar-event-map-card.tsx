"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import type { MapEventPin } from "@/lib/subculture-events";

export function SidebarEventMapCard({ pins }: { pins: MapEventPin[] }) {
  const preview = pins.slice(0, 4);

  return (
    <Card className="rounded-2xl shadow-sm border-violet-500/25 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 font-semibold text-violet-600">
          <MapPin className="h-4 w-4" />
          서브컬처·애니 행사 지도
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[10px] text-muted-foreground leading-snug">
          지스타·팝콘·코믹월드 등 공식 일정 · 약 1시간마다 자동 반영
        </p>
        <SubcultureEventsMapLazy pins={pins} heightClassName="h-40" interactive={false} />
        <ul className="space-y-1.5">
          {preview.map((p) => (
            <li key={p.id} className="text-xs min-w-0">
              <span className="font-medium text-foreground truncate block">{p.title}</span>
              <span className="text-muted-foreground">
                {format(new Date(p.startsAt), "M월 d일", { locale: ko })}
                {p.venueName ? ` · ${p.venueName}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/events/map" className="text-xs text-primary hover:underline font-medium">
          지도 크게 보기 →
        </Link>
      </CardContent>
    </Card>
  );
}
