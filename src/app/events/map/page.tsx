import Link from "next/link";

import { format } from "date-fns";

import { ko } from "date-fns/locale";

import { MapPin, ChevronLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";

import { getSubcultureMapPins } from "@/lib/subculture-events";

import { SUBCULTURE_EVENT_CATEGORY_LABELS } from "@/lib/subculture-event-seeds";



export const revalidate = 600;



export default async function EventsMapPage() {

  const pins = await getSubcultureMapPins(40);



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

          코믹월드·지스타·서울팝콘·서일페·AGF·BIAF·하비페어 등 공식·공개 일정.

          (AGF·부산웹툰 등 일부는 확정 전)

        </p>

      </div>



      <SubcultureEventsMapLazy

        pins={pins}

        heightClassName="h-[min(420px,55vh)]"

        interactive

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

          pins.map((p) => (

            <Card key={p.id} className="rounded-2xl">

              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">

                <div className="min-w-0">

                  <p className="font-semibold">{p.title}</p>

                  <p className="text-xs text-violet-600 mt-0.5">

                    {SUBCULTURE_EVENT_CATEGORY_LABELS[p.category] ?? p.category}

                    {p.source === "official" && " · 공식 일정"}

                  </p>

                  {p.description && (

                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>

                  )}

                  <p className="text-sm text-muted-foreground mt-1">

                    {format(new Date(p.startsAt), "yyyy년 M월 d일 (EEE)", { locale: ko })}

                    {p.endsAt &&

                      ` — ${format(new Date(p.endsAt), "M월 d일", { locale: ko })}`}

                  </p>

                  {p.venueName && (

                    <p className="text-sm mt-1">

                      📍 {p.venueName}

                    </p>

                  )}

                </div>

                <div className="flex gap-2 shrink-0">

                  <a

                    href={`https://map.kakao.com/link/map/${p.lat},${p.lng}`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"

                  >

                    카카오맵

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

          ))

        )}

      </div>

    </div>

  );

}

