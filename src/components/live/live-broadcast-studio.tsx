"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { Video } from "lucide-react";

/** 호스트 송출 — 브라우저(웹캠·화면공유) */
export function LiveBroadcastStudio({
  channelId,
  channelName = t("live.sx2fs"),
  onEndStream = () => undefined,
}: {
  channelId: string;
  channelName?: string;
  onEndStream?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <Video className="h-4 w-4" />
        <span>
          {t("live.s1ig1ifg")} <strong className="text-foreground">{t("live.s1dub35p")}</strong> {t("live.s1rykgb8")}
        </span>
      </div>
      <LiveBrowserStudio
        channelId={channelId}
        channelName={channelName}
        onEndStream={onEndStream}
      />
    </div>
  );
}
