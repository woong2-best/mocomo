"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";

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
    <div className="live-page-shell max-w-lg mx-auto p-6 space-y-4 text-center">
      <Monitor className="h-10 w-10 mx-auto text-violet-600" />
      <h1 className="text-xl font-bold">스튜디오를 열지 못했습니다</h1>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button type="button" variant="secondary" className="rounded-xl" onClick={() => reset()}>
          다시 시도
        </Button>
        {channelId && (
          <Button type="button" className="rounded-xl" asChild>
            <Link href={`/voice/${channelId}`}>페이지 새로고침</Link>
          </Button>
        )}
        <Button type="button" variant="outline" className="rounded-xl" asChild>
          <Link href="/live">라이브 홈</Link>
        </Button>
      </div>
    </div>
  );
}
