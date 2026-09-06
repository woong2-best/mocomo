"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { enUS, ja, ko, zhCN } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";
import {
  eventCountryFlag,
  getSubcultureMapDefaultView,
  resolveSubculturePinsForUser,
  subcultureCountrySummary,
} from "@/lib/subculture-event-countries";
import type { MapEventPin } from "@/lib/subculture-events";

function eventDateLabel(date: Date, locale: Locale): string {
  switch (locale) {
    case "ko":
      return format(date, "M월 d일", { locale: ko });
    case "ja":
      return format(date, "M月d日", { locale: ja });
    case "zh":
      return format(date, "M月d日", { locale: zhCN });
    default:
      return format(date, "MMM d", { locale: enUS });
  }
}

export function SidebarEventMapCard({ pins }: { pins: MapEventPin[] }) {
  const { countryCode, locale, t } = useLocale();
  const localPins = useMemo(
    () => resolveSubculturePinsForUser(pins, countryCode).slice(0, 12),
    [pins, countryCode]
  );
  const preview = localPins.slice(0, 4);
  const defaultView = getSubcultureMapDefaultView(countryCode);
  const summary = subcultureCountrySummary(countryCode, locale);

  return (
    <Card className="rounded-2xl shadow-sm border-violet-500/25 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 font-semibold text-violet-600">
          <MapPin className="h-4 w-4" />
          {t("sidebar.eventsMapTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {summary}
        </p>
        <SubcultureEventsMapLazy
          pins={localPins}
          heightClassName="h-56"
          interactive={false}
          defaultView={defaultView}
        />
        <ul className="space-y-1.5">
          {preview.map((p) => (
            <li key={p.id} className="text-xs min-w-0">
              <span className="font-medium text-foreground truncate block">
                {eventCountryFlag(p.country)}{" "}
                {p.title}
              </span>
              <span className="text-muted-foreground">
                {eventDateLabel(new Date(p.startsAt), locale)}
                {p.venueName ? ` · ${p.venueName}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/events/map" className="text-xs text-primary hover:underline font-medium">
          {t("sidebar.eventsMapExpand")}
        </Link>
      </CardContent>
    </Card>
  );
}
