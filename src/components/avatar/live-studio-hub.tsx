"use client";

import Link from "next/link";
import { ChevronRight, Layers, Radio, Sparkles } from "lucide-react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";

const STUDIOS = [
  {
    href: "/avatar/studio/broadcast",
    icon: Radio,
    tag: "방송",
    title: "방송 스튜디오",
    description: "유튜브·트witch 스타일 송출 설정, OBS·스트리머 프로필, 방송 준비",
    accent: "border-folk-terracotta/40 bg-folk-terracotta/10 hover:border-folk-terracotta/70",
    iconWrap: "bg-folk-terracotta/20 text-folk-terracotta",
  },
  {
    href: "/avatar/studio/2d",
    icon: Layers,
    tag: "2D",
    title: "2D 아바타 편집",
    description: "그리기·PNG 업로드 → 투명 PNG 방송 아바타",
    accent: "border-folk-cobalt/35 bg-folk-cobalt/5 hover:border-folk-cobalt/55",
    iconWrap: "bg-folk-cobalt/15 text-folk-cobalt",
  },
  {
    href: "/avatar/studio/3d",
    icon: Sparkles,
    tag: "3D",
    title: "3D 아바타 스튜디오",
    description: "VRM 체형·얼굴·헤어·의상·UV 페인트 — 라이브 VTuber 연동",
    accent: "border-folk-gold/50 bg-folk-gold/10 hover:border-folk-gold/70",
    iconWrap: "bg-folk-gold/25 text-folk-cobalt",
  },
] as const;

export function LiveStudioHub() {
  return (
    <div className="live-page-shell w-full max-w-none space-y-4 sm:space-y-5 pb-nav lg:pb-6 min-h-[calc(100dvh-var(--header-h))]">
      <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-cobalt/25 bg-folk-gold/25 text-folk-cobalt shrink-0">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="folk-tag mb-1.5 w-fit">라이브 스튜디오</p>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
            스튜디오 선택
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            방송 설정 · 2D 아바타 · 3D VRM 중 하나를 골라 작업하세요
          </p>
        </div>
      </header>

      <FolkBrushDivider className="opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {STUDIOS.map((studio) => {
          const Icon = studio.icon;
          return (
            <Link
              key={studio.href}
              href={studio.href}
              className={cn(
                "group relative flex min-h-[9.5rem] sm:min-h-[11rem] flex-col justify-between rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200",
                "shadow-folk-sm hover:shadow-folk hover:-translate-y-0.5 active:scale-[0.99]",
                studio.accent
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--folk-cobalt)/0.12)]",
                    studio.iconWrap
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {studio.tag}
                </span>
              </div>
              <div className="mt-4 space-y-1.5 min-w-0">
                <h2 className="font-display font-bold text-base sm:text-lg text-folk-cobalt folk-chunky-text">
                  {studio.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
                  {studio.description}
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-folk-cobalt group-hover:gap-2 transition-all">
                열기
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
