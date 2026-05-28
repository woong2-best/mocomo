import Link from "next/link";
import { Suspense, memo } from "react";
import {
  Eye,
  Radio,
  Sparkles,
  User,
  Video,
  MessageSquare,
  Shield,
  Search,
  Users,
  Scissors,
  Heart,
  TrendingUp,
  BadgeCheck,
  Calendar,
} from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { LiveCategoryFilter } from "@/components/live/live-category-filter";
import { LiveClipCard } from "@/components/live/live-clip-card";
import { LiveScheduledCard } from "@/components/live/live-scheduled-card";
import type { LiveStreamCategory } from "@prisma/client";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { liveCategoryLabel } from "@/lib/live-categories";
import type { LiveHubChannel, LiveHubClip, LiveHubHost } from "@/lib/live-hub-data";
import type { SupportTierLevel } from "@prisma/client";

const FEATURES = [
  { icon: Video, label: "LiveKit 저지연" },
  { icon: MessageSquare, label: "실시간 채팅" },
  { icon: Shield, label: "슬로우·금칙어" },
  { icon: Eye, label: "실시간 시청자" },
];

function LiveStreamCard({ ch, host }: { ch: LiveHubChannel; host?: LiveHubHost }) {
  const thumb = ch.thumbnailUrl ?? host?.image;
  return (
    <Link href={`/voice/${ch.id}`} prefetch={false} className="live-card group">
      <div className="live-card-thumb">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50 dark:opacity-40 group-hover:opacity-65 transition-opacity"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="h-12 w-12 text-red-500/40" />
          </div>
        )}
        <div className="live-card-scrim" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="live-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white font-medium">
            {liveCategoryLabel(ch.category)}
          </span>
        </div>
        <div className="absolute top-3 right-3 live-viewer-pill">
          <Eye className="h-3.5 w-3.5 text-red-500" />
          {ch.viewerCount}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-bold text-sm sm:text-base line-clamp-2 text-foreground dark:text-white">{ch.name}</p>
          {host && (
            <p className="text-xs text-muted-foreground dark:text-zinc-300 mt-1 flex items-center gap-1 min-w-0">
              <User className="h-3 w-3 shrink-0" />
              <DisplayNameWithSupportTier
                name={host.username}
                tier={(host.supportTierSent ?? "PEBBLE") as SupportTierLevel}
                compact
                className="min-w-0"
              />
              {host.isPartner && <BadgeCheck className="h-3 w-3 text-sky-500 shrink-0" />}
            </p>
          )}
          {ch.tags.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
              {ch.tags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

const LiveStreamCardMemo = memo(LiveStreamCard);

function StreamerChip({ host }: { host: LiveHubHost }) {
  return (
    <Link
      href={`/u/${host.username}`}
      className="flex items-center gap-2 shrink-0 rounded-xl border border-border/60 bg-card px-3 py-2 hover:border-primary/30 transition-colors"
    >
      <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
        {host.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={host.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate flex items-center gap-1">
          @{host.username}
          {host.isPartner && <BadgeCheck className="h-3.5 w-3.5 text-sky-500" />}
        </p>
        <p className="text-[11px] text-muted-foreground">{host.followerCount.toLocaleString()} 팔로워</p>
      </div>
    </Link>
  );
}

export function LiveHub({
  channels,
  hosts,
  recommendedStreamers,
  popularClips,
  followedLive,
  scheduledStreams,
  currentUserId,
}: {
  channels: LiveHubChannel[];
  hosts: LiveHubHost[];
  recommendedStreamers: LiveHubHost[];
  popularClips: LiveHubClip[];
  followedLive: LiveHubChannel[];
  scheduledStreams: {
    id: string;
    name: string;
    createdBy: string;
    scheduledAt: Date;
    category: LiveStreamCategory;
    thumbnailUrl: string | null;
  }[];
  currentUserId?: string;
}) {
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));
  const followedHostMap = hostMap;
  const totalViewers = channels.reduce((s, c) => s + c.viewerCount, 0);

  return (
    <div className="live-page-shell">
      <div className="max-w-6xl mx-auto space-y-8 pb-8">
        <header className="live-hero flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
                <Radio className="h-5 w-5" />
              </span>
              라이브
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              실시간 방송 · 클립 · 팔로우 피드를 한곳에서. Twitch·치지직 스타일 송출과 커뮤니티를 MoCoMo에 통합했습니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-background/80 dark:bg-white/5 border border-border/60 text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="[&_button]:rounded-xl shrink-0">
            <LivePageActions variant="header" />
          </div>
        </header>

        <form action="/search" method="get" className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="스트리머·태그·게시물 검색"
              className="pl-9 rounded-xl"
              minLength={2}
            />
          </div>
          <Button type="submit" variant="secondary" className="rounded-xl shrink-0">
            검색
          </Button>
        </form>

        <Suspense fallback={<div className="h-9 animate-pulse rounded-full bg-muted max-w-2xl" />}>
          <LiveCategoryFilter />
        </Suspense>

        {channels.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">지금 방송</p>
              <p className="text-xl font-bold tabular-nums">{channels.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-xs text-muted-foreground">총 시청자</p>
              <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">{totalViewers}</p>
            </div>
          </div>
        )}

        {scheduledStreams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              예약 방송
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scheduledStreams.map((s) => (
                <LiveScheduledCard
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  scheduledAt={s.scheduledAt}
                  category={s.category}
                  isOwner={currentUserId === s.createdBy}
                />
              ))}
            </div>
          </section>
        )}

        {followedLive.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              팔로우 중 라이브 · {followedLive.length}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {followedLive.map((ch) => (
                <LiveStreamCardMemo key={ch.id} ch={ch} host={followedHostMap[ch.createdBy]} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            실시간 방송 · {channels.length}
          </h2>
          {channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <p className="text-muted-foreground font-medium">이 카테고리에 진행 중인 라이브가 없습니다.</p>
              <LivePageActions variant="empty" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {channels.map((ch) => (
                <LiveStreamCardMemo key={ch.id} ch={ch} host={hostMap[ch.createdBy]} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            추천 스트리머
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {recommendedStreamers.map((h) => (
              <StreamerChip key={h.id} host={h} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            인기 클립
          </h2>
          {popularClips.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">
              아직 등록된 클립이 없습니다.{" "}
              <Link href="/live/clips/new" className="text-primary underline">
                클립 업로드
              </Link>
              로 하이라이트를 추가하세요.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {popularClips.map((clip) => (
                <LiveClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              팔로우 피드
            </h3>
            <p className="text-sm text-muted-foreground mt-1">팔로우한 크리에이터의 게시물은 홈 피드에서 확인할 수 있습니다.</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/">홈 피드로 이동</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
