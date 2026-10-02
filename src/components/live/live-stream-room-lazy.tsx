"use client";

import { useLocale } from "@/components/providers/locale-provider";
import dynamic from "next/dynamic";

export const LiveStreamRoomLazy = dynamic(
  () => import("@/components/live/live-stream-room").then((mod) => mod.LiveStreamRoom),
  {
    loading: () => (
      <div className="rounded-2xl border border-border p-12 text-center text-muted-foreground animate-pulse">
        {t("live.sh6ugup")}
      </div>
    ),
  }
);
