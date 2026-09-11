"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, MapPin } from "lucide-react";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getSubcultureMapDefaultView,
  resolveSubculturePinsForUser,
  selectSidebarEventPins,
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
  const mapPins = useMemo(
    () =>
      selectSidebarEventPins(resolveSubculturePinsForUser(pins, countryCode)),
    [pins, countryCode]
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
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2 font-semibold text-violet-600">
            <MapPin className="h-4 w-4 shrink-0" />
            {t("sidebar.eventsMapTitle")}
          </CardTitle>
          <Link
            href="/events/map"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label={t("sidebar.eventsMapExpand")}
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 p-0 pb-4">
        <Link href="/events/map" className="block px-4 shrink-0">
          <SubcultureEventsMapLazy
            pins={mapPins}
            heightClassName="h-44"
            interactive
            showNavigationControls={false}
            defaultView={defaultView}
            className="subculture-events-map--sidebar"
          />
        </Link>
      </CardContent>
    </Card>
  );
}
