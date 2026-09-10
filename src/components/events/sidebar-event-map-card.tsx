"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { SubcultureEventPinCard } from "@/components/events/subculture-event-pin-card";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getSubcultureMapDefaultView,
  resolveSubculturePinsForUser,
} from "@/lib/subculture-event-countries";
import type { MapEventPin } from "@/lib/subculture-events";
import { cn } from "@/lib/utils";

export function SidebarEventMapCard({
  pins,
  className,
}: {
  pins: MapEventPin[];
  className?: string;
}) {
  const { countryCode, t } = useLocale();
  const localPins = useMemo(
    () => resolveSubculturePinsForUser(pins, countryCode).slice(0, 36),
    [pins, countryCode]
  );
  const eventPins = useMemo(
    () => localPins.filter((p) => p.category !== "maid_cafe"),
    [localPins]
  );
  const maidPins = useMemo(
    () => localPins.filter((p) => p.category === "maid_cafe"),
    [localPins]
  );
  const defaultView = getSubcultureMapDefaultView(countryCode);

  return (
    <Card
      className={cn(
        "rounded-2xl shadow-sm border-violet-500/25 overflow-hidden flex flex-col min-h-0",
        className
      )}
    >
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2 font-semibold text-violet-600">
          <MapPin className="h-4 w-4" />
          {t("sidebar.eventsMapTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        <div className="px-4 pb-3 shrink-0">
          <SubcultureEventsMapLazy
            pins={localPins}
            heightClassName="h-40"
            interactive
            showNavigationControls={false}
            defaultView={defaultView}
          />
        </div>

        <div className="subculture-sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 space-y-3">
          {eventPins.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground">다가오는 행사</h2>
              {eventPins.map((p) => (
                <SubcultureEventPinCard key={p.id} pin={p} variant="sidebar" />
              ))}
            </div>
          )}

          {maidPins.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-pink-500">
                메이드 카페 · 상설 ({maidPins.length})
              </h2>
              {maidPins.map((p) => (
                <SubcultureEventPinCard key={p.id} pin={p} variant="sidebar" />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 shrink-0 border-t border-border/40">
          <Link href="/events/map" className="text-xs text-primary hover:underline font-medium">
            {t("sidebar.eventsMapExpand")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
