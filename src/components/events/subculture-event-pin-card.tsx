"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { eventCountryFlag } from "@/lib/subculture-event-countries";
import {
  SUBCULTURE_EVENT_CATEGORY_COLORS,
} from "@/lib/subculture-event-types";
import { mapLinkForEvent, type MapEventPin } from "@/lib/subculture-event-pins";
import { cn } from "@/lib/utils";

export function SubcultureEventPinCard({
  pin,
  variant = "default",
}: {
  pin: MapEventPin;
  variant?: "default" | "sidebar";
}) {
  const mapLink = mapLinkForEvent(pin);
  const isMaid = pin.category === "maid_cafe";
  const isSidebar = variant === "sidebar";

  return (
    <Card className={cn("rounded-2xl", isSidebar && "rounded-xl shadow-none")}>
      <CardContent
        className={cn(
          "flex flex-col gap-2",
          isSidebar ? "p-3" : "p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-2"
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold flex items-center gap-2 flex-wrap",
              isSidebar && "text-xs leading-snug"
            )}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                background:
                  SUBCULTURE_EVENT_CATEGORY_COLORS[pin.category as keyof typeof SUBCULTURE_EVENT_CATEGORY_COLORS] ??
                  SUBCULTURE_EVENT_CATEGORY_COLORS.other,
              }}
              aria-hidden
            />
            <span>{eventCountryFlag(pin.country)}</span>
            {pin.title}
          </p>
          {pin.description && (
            <p
              className={cn(
                "text-muted-foreground mt-1",
                isSidebar ? "text-[10px] leading-snug line-clamp-2" : "text-xs"
              )}
            >
              {pin.description}
            </p>
          )}
          <p
            className={cn(
              "text-muted-foreground mt-1",
              isSidebar ? "text-[11px]" : "text-sm"
            )}
          >
            {isMaid ? (
              <span className="text-pink-500 font-medium">상설 영업</span>
            ) : (
              <>
                {format(new Date(pin.startsAt), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                {pin.endsAt &&
                  ` — ${format(new Date(pin.endsAt), "M월 d일", { locale: ko })}`}
              </>
            )}
          </p>
          {pin.venueName && (
            <p className={cn("mt-1", isSidebar ? "text-[11px]" : "text-sm")}>
              📍 {pin.venueName}
            </p>
          )}
        </div>
        <div className={cn("flex gap-2 shrink-0", isSidebar && "flex-wrap")}>
          <a
            href={mapLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            {mapLink.label}
            <ExternalLink className="h-3 w-3" />
          </a>
          {pin.sourceUrl && (
            <a
              href={pin.sourceUrl}
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
}
