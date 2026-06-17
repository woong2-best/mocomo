import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MapPin, ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import {
  eventCountryFlag,
  getSubcultureMapDefaultView,
  SUBCULTURE_EVENT_COUNTRY_LABELS,
  subcultureCountrySummary,
  userCountryToEventCountry,
} from "@/lib/subculture-event-countries";
import { getRequestCountryCode, getRequestLocale } from "@/lib/i18n/server";
import {
  getSubcultureMapPinsForUser,
  mapLinkForEvent,
} from "@/lib/subculture-events";
import { SUBCULTURE_EVENT_CATEGORY_LABELS } from "@/lib/subculture-event-seeds";

export const revalidate = 600;

export default async function EventsMapPage() {
  const [countryCode, locale] = await Promise.all([
    getRequestCountryCode(),
    getRequestLocale(),
  ]);
  const pins = await getSubcultureMapPinsForUser(56, countryCode);
  const eventCountry = userCountryToEventCountry(countryCode);
  const defaultView = getSubcultureMapDefaultView(countryCode);
  const summary = subcultureCountrySummary(countryCode, locale);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/events">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2">
            <ChevronLeft className="h-4 w-4" />
            이벤트
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-7 w-7 text-violet-500" />
          서브컬처·애니 행사 지도
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {summary} · 매일 cron 갱신
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {eventCountryFlag(eventCountry)} {SUBCULTURE_EVENT_COUNTRY_LABELS[eventCountry]} 기준 · 설정에서 국가 변경 가능
        </p>
      </div>

      <SubcultureEventsMapLazy
        pins={pins}
        heightClassName="h-[min(420px,55vh)]"
        interactive
        defaultView={defaultView}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">다가오는 행사</h2>
        {pins.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              등록된 행사가 없습니다.
            </CardContent>
          </Card>
        ) : (
          pins.map((p) => {
            const mapLink = mapLinkForEvent(p);
            return (
              <Card key={p.id} className="rounded-2xl">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold flex items-center gap-2 flex-wrap">
                      <span>{eventCountryFlag(p.country)}</span>
                      {p.title}
                    </p>
                    <p className="text-xs text-violet-600 mt-0.5">
                      {SUBCULTURE_EVENT_COUNTRY_LABELS[p.country]} ·{" "}
                      {SUBCULTURE_EVENT_CATEGORY_LABELS[p.category] ?? p.category}
                      {(p.source === "official" || p.source === "auto") && " · 공식 자동 수집"}
                    </p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(p.startsAt), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                      {p.endsAt &&
                        ` — ${format(new Date(p.endsAt), "M월 d일", { locale: ko })}`}
                    </p>
                    {p.venueName && <p className="text-sm mt-1">📍 {p.venueName}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={mapLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {mapLink.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {p.sourceUrl && (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
                      >
                        공식
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
