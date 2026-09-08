"use client";

import Link from "next/link";
import { BadgeCheck, Calendar, Radio, User } from "lucide-react";
import { LiveHubNav } from "@/components/live/live-hub-nav";
import { LivePageChrome, LivePageTitle } from "@/components/live/live-page-chrome";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import type { LiveScheduleEntry, LiveScheduledBroadcast } from "@/lib/live-schedule-data";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

function formatScheduleDate(d: Date, locale: string) {
  return d.toLocaleString(locale.startsWith("ko") ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LiveScheduleBoard({
  entries,
  broadcasts,
  isStreamer,
}: {
  entries: LiveScheduleEntry[];
  broadcasts: LiveScheduledBroadcast[];
  isStreamer: boolean;
}) {
  const { locale, t } = useLocale();

  return (
    <LivePageChrome>
      <header className="live-hero flex flex-wrap items-center justify-between gap-4 !py-4 !px-5">
        <LivePageTitle>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5 tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-folk-terracotta text-white shadow-md">
              <Calendar className="h-5 w-5" />
            </span>
            {t("live.schedule")}
          </h1>
        </LivePageTitle>
        <LiveHubNav activeView="schedule" />
      </header>

      {isStreamer ? (
        <div className="rounded-2xl border border-folk-terracotta/30 bg-folk-terracotta/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("live.scheduleStudioHint")}</p>
          <Button asChild size="sm" className="rounded-xl shrink-0">
            <Link href="/avatar/studio/broadcast">{t("live.liveStudio")}</Link>
          </Button>
        </div>
      ) : null}

      {broadcasts.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-base font-bold tracking-tight">{t("live.scheduled")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {broadcasts.map((b) => (
              <Link
                key={b.id}
                href={`/voice/${b.id}`}
                className="rounded-2xl border border-border/70 bg-card/80 p-4 hover:border-primary/30 transition-colors block"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden shrink-0">
                    {b.thumbnailUrl || b.host?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.thumbnailUrl ?? b.host?.image ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Radio className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-2">{b.name}</p>
                    {b.host ? (
                      <p className="text-xs text-muted-foreground mt-0.5">@{b.host.username}</p>
                    ) : null}
                    <p className="text-xs font-medium text-folk-terracotta mt-1.5">
                      {formatScheduleDate(new Date(b.scheduledAt), locale)}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                      {localizedLiveCategoryLabel(b.category, locale)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-bold tracking-tight">{t("live.streamerSchedules")}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center rounded-2xl border border-dashed">
            {t("live.scheduleEmpty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.userId}>
                <Link
                  href={`/u/${entry.username}`}
                  className="flex gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0 ring-2 ring-[hsl(var(--folk-cobalt)/0.2)]">
                    {entry.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold flex items-center gap-1">
                      @{entry.username}
                      {entry.isPartner ? <BadgeCheck className="h-3.5 w-3.5 text-sky-500" /> : null}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {entry.scheduleNote}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {t("live.followers", { count: entry.followerCount.toLocaleString() })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LivePageChrome>
  );
}
