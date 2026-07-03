"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutList, Rows3 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { updateFeedDisplayMode } from "@/actions/feed-display";
import type { FeedDisplayMode } from "@/lib/feed-display-mode";
import { cn } from "@/lib/utils";

export function FeedDisplaySettingsForm({
  initialMode,
}: {
  initialMode: FeedDisplayMode;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<FeedDisplayMode>(initialMode);
  const [loading, setLoading] = useState<FeedDisplayMode | null>(null);
  const [saved, setSaved] = useState(false);

  async function select(next: FeedDisplayMode) {
    if (next === mode || loading) return;
    setLoading(next);
    setSaved(false);
    const result = await updateFeedDisplayMode({ mode: next });
    setLoading(null);
    if (result.error) return;
    setMode(next);
    setSaved(true);
    router.refresh();
  }

  const options: {
    value: FeedDisplayMode;
    icon: typeof Rows3;
    labelKey: "settings.feedDisplayTimeline" | "settings.feedDisplayCompact";
    descKey: "settings.feedDisplayTimelineDesc" | "settings.feedDisplayCompactDesc";
  }[] = [
    {
      value: "TIMELINE",
      icon: Rows3,
      labelKey: "settings.feedDisplayTimeline",
      descKey: "settings.feedDisplayTimelineDesc",
    },
    {
      value: "COMPACT",
      icon: LayoutList,
      labelKey: "settings.feedDisplayCompact",
      descKey: "settings.feedDisplayCompactDesc",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settings.feedDisplayDesc")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(({ value, icon: Icon, labelKey, descKey }) => {
          const active = mode === value;
          const busy = loading === value;
          return (
            <button
              key={value}
              type="button"
              disabled={!!loading}
              onClick={() => select(value)}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all",
                active
                  ? "border-folk-terracotta bg-folk-terracotta/5 shadow-folk-sm"
                  : "border-border hover:border-folk-cobalt/30 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-5 w-5", active ? "text-folk-terracotta" : "text-muted-foreground")} />
                <span className="font-semibold text-sm">{t(labelKey)}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
              {busy && (
                <p className="text-xs text-primary mt-2">{t("common.loading")}</p>
              )}
            </button>
          );
        })}
      </div>
      {saved && <p className="text-sm text-primary">{t("settings.saved")}</p>}
    </div>
  );
}
