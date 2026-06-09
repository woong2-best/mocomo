"use client";

import Link from "next/link";
import {
  ExternalLink,
  MessageSquare,
  Monitor,
  Radio,
  Settings2,
  Shield,
  Video,
} from "lucide-react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { StudioBackLink } from "@/components/avatar/studio-back-link";
import { StreamerSettingsForm } from "@/components/live/streamer-settings-form";
import { LiveObsStandardGuide } from "@/components/live/live-obs-standard-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_LINKS: {
  href: string;
  icon: typeof Video;
  title: string;
  description: string;
  external?: boolean;
}[] = [
  {
    href: "/voice/new",
    icon: Video,
    title: "방송 만들기",
    description: "제목·카테고리 설정 후 브라우저에서 바로 송출",
  },
  {
    href: "/avatar/broadcast",
    icon: Monitor,
    title: "OBS 브라우저 소스",
    description: "투명/크로마키 VTuber 아바타 URL",
    external: true,
  },
  {
    href: "/live",
    icon: Radio,
    title: "라이브 홈",
    description: "시청 중인 방송·팔로우 스트리머",
  },
  {
    href: "/settings/streamer",
    icon: Settings2,
    title: "스트리머 설정",
    description: "파트너·추가 프로필 (레거시 경로)",
  },
];

export function BroadcastStudioPanel({
  initial,
}: {
  initial: { bio: string; announcement: string; scheduleNote: string };
}) {
  return (
    <div className="live-page-shell w-full max-w-none space-y-4 sm:space-y-5 pb-nav lg:pb-6 min-h-[calc(100dvh-var(--header-h))]">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
        <StudioBackLink />

        <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-terracotta/30 bg-folk-terracotta/15 text-folk-terracotta shrink-0">
            <Radio className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="folk-tag mb-1.5 w-fit">방송</p>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
              방송 스튜디오
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              유튜브·트witch처럼 방송 정보·송출·OBS를 한곳에서 준비합니다
            </p>
          </div>
          <Button asChild className="rounded-xl gap-2 shrink-0">
            <Link href="/voice/new">
              <Video className="h-4 w-4" />
              방송 시작
            </Link>
          </Button>
        </header>

        <FolkBrushDivider className="opacity-50" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="folk-card block p-4 hover:border-folk-terracotta/50 transition-colors"
              >
                <Icon className="h-5 w-5 text-folk-terracotta mb-2" />
                <p className="font-semibold text-sm flex items-center gap-1">
                  {item.title}
                  {item.external ? <ExternalLink className="h-3 w-3 text-muted-foreground" /> : null}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="folk-card border-folk-cobalt/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-folk-cobalt" />
                스트리머 프로필
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                채널 소개·공지·방송 일정 — 시청자 프로필·라이브 허브에 표시됩니다
              </p>
            </CardHeader>
            <CardContent>
              <StreamerSettingsForm initial={initial} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="folk-card border-violet-500/25 bg-violet-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-violet-600" />
                  OBS · RTMP 송출
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <LiveObsStandardGuide />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  방송을 만든 뒤 해당 방의 스튜디오 화면에서 서버·방송 키를 확인하세요. OBS 「방송
                  시작」만 누르면 MoCoMo 시청 화면에 WebRTC로 표시됩니다.
                </p>
                <Button asChild variant="outline" size="sm" className="rounded-xl w-full">
                  <Link href="/voice/new">방송 만들고 OBS 키 받기</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="folk-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Shield className="h-4 w-4 text-folk-cobalt" />
                  채팅·운영
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                  방송 중 슬로우 모드·금칙어·시청자 관리는 각 방 스튜디오 설정에서 변경합니다
                </p>
                <p>브라우저 송출 시 웹캠·화면 공유·마이크는 방송 스튜디오 화면에서 선택합니다</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
