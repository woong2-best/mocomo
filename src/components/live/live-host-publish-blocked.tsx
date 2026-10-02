"use client";

import { useLocale } from "@/components/providers/locale-provider";
import Link from "next/link";
import { MonitorSmartphone, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 다른 기기·탭에서 이미 송출 중 — 이 화면에서는 방송 불가 */
export function LiveHostPublishBlocked({
  channelName,
  onEndStream,
}: {
  channelName: string;
  onEndStream: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-4 min-h-[min(50vh,360px)] justify-center">
      <div className="rounded-xl border border-border bg-muted/30 px-5 py-6 text-center space-y-3">
        <MonitorSmartphone className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-base font-semibold">{t("live.s1nu1t5d")}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {t("live.publishBlocked.channelIntro", { channelName })}
          <strong>{t("live.s1sfaene")}</strong>
          {t("live.s58hor1")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("live.s124ma9f")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/live">{t("live.sx1ht4s")}</Link>
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="rounded-xl gap-1"
          onClick={onEndStream}
        >
          <Radio className="h-4 w-4" />
          {t("live.s1693sv6")}
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground">
        {t("live.s1lz7cjn")}
      </p>
    </div>
  );
}
