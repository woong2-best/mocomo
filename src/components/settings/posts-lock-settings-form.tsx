"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { updatePostsLocked } from "@/actions/posts-lock";
import { cn } from "@/lib/utils";

export function PostsLockSettingsForm({ initialLocked }: { initialLocked: boolean }) {
  const { t } = useLocale();
  const router = useRouter();
  const [locked, setLocked] = useState(initialLocked);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function select(next: boolean) {
    if (next === locked || loading) return;
    setLoading(true);
    setSaved(false);
    const result = await updatePostsLocked({ locked: next });
    setLoading(false);
    if ("error" in result && result.error) return;
    setLocked(next);
    setSaved(true);
    router.refresh();
  }

  const options: {
    value: boolean;
    icon: typeof Lock;
    labelKey: "settings.postsLockOn" | "settings.postsLockOff";
    descKey: "settings.postsLockOnDesc" | "settings.postsLockOffDesc";
  }[] = [
    {
      value: false,
      icon: LockOpen,
      labelKey: "settings.postsLockOff",
      descKey: "settings.postsLockOffDesc",
    },
    {
      value: true,
      icon: Lock,
      labelKey: "settings.postsLockOn",
      descKey: "settings.postsLockOnDesc",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settings.postsLockDesc")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(({ value, icon: Icon, labelKey, descKey }) => {
          const active = locked === value;
          return (
            <button
              key={String(value)}
              type="button"
              disabled={loading}
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
            </button>
          );
        })}
      </div>
      {saved && <p className="text-sm text-primary">{t("settings.saved")}</p>}
    </div>
  );
}
