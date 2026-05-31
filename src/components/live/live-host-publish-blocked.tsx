"use client";

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
  return (
    <div className="flex flex-col gap-4 min-h-[min(50vh,360px)] justify-center">
      <div className="rounded-xl border border-border bg-muted/30 px-5 py-6 text-center space-y-3">
        <MonitorSmartphone className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-base font-semibold">다른 기기에서 방송 중</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          「{channelName}」 방송은 <strong>방송을 시작한 기기·브라우저</strong>에서만
          진행할 수 있습니다. 노트북에서 키면 노트북, 폰에서 키면 폰에서만 송출·제어하세요.
        </p>
        <p className="text-xs text-muted-foreground">
          이 화면에서는 시청 화면을 대신 보여주지 않습니다. 송출 기기로 돌아가 주세요.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/live">라이브 홈</Link>
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="rounded-xl gap-1"
          onClick={onEndStream}
        >
          <Radio className="h-4 w-4" />
          방송 종료 (전체)
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground">
        폰이 꺼졌을 때만 「방송 종료」로 전체 방송을 끝낸 뒤, 이 기기에서 새로 시작할 수 있습니다.
      </p>
    </div>
  );
}
