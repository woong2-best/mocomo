"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");


import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Monitor } from "lucide-react";
import { AppErrorState } from "@/components/ui/app-error-state";

/** 라이브 스튜디오 전용 오류 — OBS 키는 API로 별도 발급 가능 */
export default function VoiceRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const channelId = typeof params?.id === "string" ? params.id : null;

  useEffect(() => {
    console.error("[voice-room-error]", error);
  }, [error]);

  const hint =
    error.message?.includes("map") || error.message?.includes("map is not a function")
      ? i18n("app.voice.ctrl_shift_r")
      : error.message?.trim() || i18n("app.voice.s1ih0y0s");

  return (
    <AppErrorState
      title={i18n("app.voice.sbsa93w")}
      description={hint}
      icon={Monitor}
      variant="destructive"
      onRetry={() => reset()}
      primaryOnClick={channelId ? () => window.location.reload() : undefined}
      primaryHref={channelId ? undefined : "/live"}
      primaryLabel={channelId ? i18n("app.voice.s1nx7peg") : i18n("avatar.sx1ht4s")}
      secondaryHref={channelId ? "/live" : undefined}
      secondaryLabel={channelId ? i18n("avatar.sx1ht4s") : undefined}
    />
  );
}
