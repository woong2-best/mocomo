"use client";

import { Eye, Radio, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { LiveHostCollabPasswordStrip } from "@/components/live/live-host-collab-password-strip";
import { LiveHostSettings } from "@/components/live/live-host-settings";
import { LiveMobileOverlayChat } from "@/components/live/mobile/live-mobile-overlay-chat";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { ensureStringArray } from "@/lib/ensure-array";
import type { LiveStreamCategory } from "@prisma/client";
import { LiveDonationAlertOverlay, type LiveTipAlert } from "@/components/live/live-donation-alert-overlay";

export type LiveMobilePortraitHostProps = {
  channelId: string;
  channelName: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
  category?: LiveStreamCategory;
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  collabPassword?: string | null;
  recentTips?: LiveTipAlert[];
  donationAlertsOnStream?: boolean;
};

/** 호스트 — 모바일 세로 인스타 라이브 UI (데스크탑과 분리) */
export function LiveMobilePortraitHost({
  channelId,
  channelName,
  viewerCount,
  onViewerCount,
  onEndStream,
  slowModeSeconds,
  chatBannedWords,
  collabPassword,
  recentTips = [],
  donationAlertsOnStream = false,
}: LiveMobilePortraitHostProps) {
  const { chatOverlayEnabled } = useLiveChat();

  return (
    <div className="live-mobile-portrait-root fixed inset-0 z-[110] bg-black text-white">
      <div className="absolute inset-0 z-0">
        <LiveBrowserStudio
          channelId={channelId}
          channelName={channelName}
          onEndStream={onEndStream}
          collabPassword={collabPassword}
          immersive
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75 pointer-events-none z-10" />

      {donationAlertsOnStream ? <LiveDonationAlertOverlay tips={recentTips} /> : null}

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-safe pb-2 pointer-events-auto">
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-pink-500 to-orange-500">
          라이브
        </span>
        <p className="text-sm font-semibold truncate flex-1 min-w-0">{channelName}</p>
        <span className="flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-xs tabular-nums">
          <Eye className="h-3.5 w-3.5" />
          {viewerCount}
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/55 hover:text-white"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>방송 설정</DialogTitle>
            </DialogHeader>
            <LiveHostSettings
              channelId={channelId}
              slowModeSeconds={slowModeSeconds ?? 0}
              bannedWords={ensureStringArray(chatBannedWords)}
              initialDonationAlertsOnStream={donationAlertsOnStream}
              embedded
            />
          </DialogContent>
        </Dialog>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-black/40 text-white hover:bg-red-600/80 hover:text-white"
          onClick={onEndStream}
          aria-label="방송 종료"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="absolute top-[calc(env(safe-area-inset-top)+3rem)] left-3 right-3 z-20 pointer-events-none">
        <LiveHostCollabPasswordStrip channelId={channelId} password={collabPassword} compact />
      </div>

      <div className="absolute left-0 right-0 bottom-0 z-20 max-h-[42vh] pointer-events-none">
        <LiveMobileOverlayChat
          channelId={channelId}
          onViewerCount={onViewerCount}
          showMessages={chatOverlayEnabled}
        />
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-0 right-0 z-20 flex justify-center pointer-events-none">
        <span className="text-[10px] text-white/70 flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full">
          <Radio className="h-3 w-3" />
          세로 모드 방송
        </span>
      </div>
    </div>
  );
}
