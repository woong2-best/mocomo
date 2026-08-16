"use client";

import { Eye, Mic2, Radio, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VoiceLiveHostStudio } from "@/components/voice-live/voice-live-studio";
import { LiveMobileOverlayChat } from "@/components/live/mobile/live-mobile-overlay-chat";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { LiveDonationAlertOverlay, type LiveTipAlert } from "@/components/live/live-donation-alert-overlay";

/** 보이스 라이브 호스트 — 모바일 세로 풀스크린 */
export function LiveMobilePortraitVoiceHost({
  channelId,
  channelName,
  hostImage,
  hostDisplayName,
  viewerCount,
  onViewerCount,
  onEndStream,
  recentTips = [],
  donationAlertsOnStream = false,
}: {
  channelId: string;
  channelName: string;
  hostImage?: string | null;
  hostDisplayName?: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
  recentTips?: LiveTipAlert[];
  donationAlertsOnStream?: boolean;
}) {
  const router = useRouter();
  const { chatOverlayEnabled } = useLiveChat();

  return (
    <div className="live-mobile-portrait-root fixed inset-0 z-[110] bg-gradient-to-b from-violet-950 via-black to-black text-white">
      <div className="absolute inset-0 flex items-center justify-center px-6 pt-16 pb-36">
        <VoiceLiveHostStudio
          channelId={channelId}
          channelName={channelName}
          hostImage={hostImage}
          hostDisplayName={hostDisplayName}
        />
      </div>

      {donationAlertsOnStream ? <LiveDonationAlertOverlay tips={recentTips} /> : null}

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-safe pb-2 pointer-events-auto">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-violet-600 flex items-center gap-1">
          <Mic2 className="h-3 w-3" />
          보이스 LIVE
        </span>
        <p className="text-sm font-semibold truncate flex-1 min-w-0">{channelName}</p>
        <span className="flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-xs tabular-nums">
          <Eye className="h-3.5 w-3.5" />
          {viewerCount}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/55"
          onClick={() => router.push("/live")}
          aria-label="나가기"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="absolute left-3 right-3 bottom-24 z-20 pointer-events-auto">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full rounded-xl gap-1"
          onClick={onEndStream}
        >
          <Radio className="h-4 w-4" />
          방송 종료
        </Button>
      </div>

      <div className="absolute left-0 right-0 bottom-0 z-20 flex flex-col justify-end max-h-[40vh] pointer-events-none">
        <LiveMobileOverlayChat
          channelId={channelId}
          onViewerCount={onViewerCount}
          showMessages={chatOverlayEnabled}
        />
      </div>
    </div>
  );
}
