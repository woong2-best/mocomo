import Link from "next/link";
import type { ReactNode } from "react";
import { LiveStreamCardMemo } from "@/components/live/live-channel-grid";
import {
  Eye,
  Radio,
  User,
  Video,
  MessageSquare,
  Shield,
  Search,
  Users,
  Heart,
  TrendingUp,
  BadgeCheck,
  Calendar,
  Mic2,
} from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { LiveCategoryFilter } from "@/components/live/live-category-filter";
import { LiveScheduledCard } from "@/components/live/live-scheduled-card";
import type { LiveStreamCategory } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

const FEATURES = [
  { icon: Video, label: "웹캠 · 화면공유" },
  { icon: Mic2, label: "보이스 라이브" },
  { icon: MessageSquare, label: "실시간 채팅" },
  { icon: Shield, label: "슬로우·금칙어" },
  { icon: Eye, label: "후원·시청자" },
];

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
  recommendedStreamers,
  followedLive,
  followedHosts,
  scheduledStreams,
  currentUserId,
  channelFeed,
}: {
  recommendedStreamers: LiveHubHost[];
  followedLive: LiveHubChannel[];
  followedHosts: LiveHubHost[];
  scheduledStreams: {
    id: string;
    name: string;
    createdBy: string;
    scheduledAt: Date;
    category: LiveStreamCategory;
    thumbnailUrl: string | null;
    broadcastMode?: string | null;
  }[];
  currentUserId?: string;
  channelFeed: ReactNode;
}) {
  const followedHostMap = Object.fromEntries(followedHosts.map((h) => [h.id, h]));

  return (
    <div className="live-page-shell">
      <div className="max-w-6xl mx-auto space-y-8 pb-8 native-live-pad">
        <header className="live-hero flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 tracking-tight">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-folk-terracotta text-white shadow-md">
                <Radio className="h-5 w-5" />
              </span>
              라이브
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              브라우저에서 바로 방송(유튜브·치지직 방식) · 실시간 시청 · 후원·채팅. 스트리머마다 독립 방입니다.
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

        <LiveCategoryFilter />

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
                  broadcastMode={s.broadcastMode}
                  isOwner={currentUserId === s.createdBy}
                />
              ))}
            </div>
          </section>
        )}

        {followedLive.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-folk-terracotta" />
              팔로우 중 라이브 · {followedLive.length}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {followedLive.map((ch) => (
                <LiveStreamCardMemo key={ch.id} ch={ch} host={followedHostMap[ch.createdBy]} />
              ))}
            </div>
          </section>
        )}

        {channelFeed}

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

        <section className="rounded-2xl border border-border bg-card/50 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              팔로우 피드
            </h3>
            <p className="text-sm text-muted-foreground mt-1">팔로우한 크리에이터의 게시물은 홈 피드에서 확인할 수 있습니다.</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={COMMUNITY_FEED_PATH}>홈 피드로 이동</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
