"use client";

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
      ? "화면 구성 오류입니다. 강력 새로고침(Ctrl+Shift+R) 후 다시 입장해 주세요."
      : error.message?.trim() || "일시적인 오류일 수 있습니다.";

  return (
    <AppErrorState
      title="스튜디오를 열지 못했습니다"
      description={hint}
      icon={Monitor}
      variant="destructive"
      onRetry={() => reset()}
      primaryOnClick={channelId ? () => window.location.reload() : undefined}
      primaryHref={channelId ? undefined : "/live"}
      primaryLabel={channelId ? "페이지 새로고침" : "라이브 홈"}
      secondaryHref={channelId ? "/live" : undefined}
      secondaryLabel={channelId ? "라이브 홈" : undefined}
    />
  );
}
