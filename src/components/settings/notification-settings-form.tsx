"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { updateNotificationSettings } from "@/actions/notification-settings";
import type { NotificationSettings } from "@/lib/notification-settings";
import { errorText } from "@/lib/i18n/error-text";

type ToggleKey = keyof NotificationSettings;

const ROWS: { key: ToggleKey; label: string; hint?: string }[] = [
  {
    key: "pushNotificationsEnabled",
    label: "푸시 알림 전체",
    hint: "이 기기로 보내는 모바일 푸시의 전체 스위치입니다.",
  },
  { key: "notifyDirectMessages", label: "직접 메시지 (Direct Messages)" },
  { key: "notifyMentionsReplies", label: "언급 및 답글 (Mentions & Replies)" },
  { key: "notifyLikesInteractions", label: "좋아요 및 반응 (Likes & Interactions)" },
  {
    key: "notifyGroupMessages",
    label: "그룹 메시지 및 공지 (Group Messages & Announcements)",
  },
];

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState<ToggleKey | null>(null);
  const [error, setError] = useState("");

  async function onToggle(key: ToggleKey) {
    if (pending) return;
    const masterOff = !settings.pushNotificationsEnabled;
    if (masterOff && key !== "pushNotificationsEnabled") return;

    const checked = !settings[key];
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: checked }));
    setPending(key);
    setError("");
    const result = await updateNotificationSettings({ [key]: checked });
    setPending(null);
    if ("error" in result) {
      setSettings((s) => ({ ...s, [key]: prev }));
      setError(errorText(result.error));
      return;
    }
    setSettings(result.settings);
    router.refresh();
  }

  const masterOff = !settings.pushNotificationsEnabled;

  return (
    <div className="space-y-3">
      {ROWS.map((row) => {
        const on = settings[row.key];
        const disabled = (masterOff && row.key !== "pushNotificationsEnabled") || pending === row.key;
        return (
          <button
            key={row.key}
            type="button"
            disabled={disabled}
            onClick={() => void onToggle(row.key)}
            className={cn(
              "flex w-full items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors",
              on
                ? "border-folk-terracotta bg-folk-terracotta/5"
                : "border-border hover:border-folk-cobalt/30",
              disabled && "opacity-50"
            )}
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-snug">{row.label}</p>
              {row.hint ? (
                <p className="text-xs text-muted-foreground leading-relaxed">{row.hint}</p>
              ) : null}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                on ? "bg-folk-terracotta text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {on ? "ON" : "OFF"}
            </span>
          </button>
        );
      })}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
