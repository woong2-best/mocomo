import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Radio, Search } from "lucide-react";
import { getCachedLiveChannels } from "@/lib/cached-data";
import { Button } from "@/components/ui/button";
import { getCachedExploreData } from "@/lib/cached-data";
import { LiveModeBadge } from "@/components/live/live-mode-badge";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { PageSection } from "@/components/layout/page-section";
import type { SupportTierLevel } from "@prisma/client";
import { userDisplayName } from "@/lib/user-public-select";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { getServerTranslator } from "@/lib/i18n/server";

export async function ExploreContentAsync() {
  const { t } = await getServerTranslator();
  type PostRow = {
    id: string;
    title: string | null;
    content: string;
    author: {
      username: string;
      name: string | null;
      image: string | null;
      supportTierSent: SupportTierLevel;
    };
    _count: { likes: number; comments: number };
  };
  type UserRow = {
    username: string;
    name: string | null;
    image: string | null;
    supportTierSent: SupportTierLevel;
    _count: { followers: number };
  };

  let trendingPosts: PostRow[] = [];
  let suggestedUsers: UserRow[] = [];
  let liveChannels: Awaited<ReturnType<typeof getCachedLiveChannels>>["channels"] = [];
  let dbOk = true;

  try {
    const [data, live] = await Promise.all([getCachedExploreData(), getCachedLiveChannels()]);
    trendingPosts = data.trendingPosts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      author: p.author,
      _count: p._count,
    }));
    suggestedUsers = data.suggestedUsers;
    liveChannels = live.channels;
  } catch {
    dbOk = false;
  }

  return (
    <div className="space-y-6">
      {!dbOk && (
        <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
          {t("explore.dbError")}{" "}
          <Link href="/auth/signup" className="text-primary underline">
            {t("auth.signupTitle")}
          </Link>
        </p>
      )}

      <Card className="folk-card-interactive rounded-2xl border-folk-terracotta/30 bg-folk-terracotta/5 overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display font-bold flex items-center gap-1.5 text-folk-cobalt dark:text-foreground">
              <Search className="h-4 w-4 text-folk-terracotta" />
              {t("explore.matchTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("explore.matchDesc")}</p>
          </div>
          <Button asChild size="sm" className="rounded-xl shrink-0 bg-folk-terracotta text-white hover:bg-folk-terracotta/90">
            <Link href="/discover">{t("explore.start")}</Link>
          </Button>
        </CardContent>
      </Card>

      {isLiveFeatureEnabled() && liveChannels.length > 0 && (
        <PageSection
          title={t("explore.liveNow")}
          icon={Radio}
          action={{ href: "/live", label: t("explore.viewAll") }}
        >
          <div className="flex flex-wrap gap-2 moco-stagger">
            {liveChannels.map((ch) => (
              <Link
                key={ch.id}
                href={`/voice/${ch.id}`}
                className="folk-card-interactive inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-folk-terracotta/30 bg-folk-terracotta/5 hover:bg-folk-terracotta/10"
              >
                <LiveModeBadge broadcastMode={ch.broadcastMode} compact />
                <span className="line-clamp-1">{ch.name}</span>
                <span className="text-muted-foreground shrink-0">
                  · {t("explore.viewers", { count: String(ch.viewerCount) })}
                </span>
              </Link>
            ))}
          </div>
        </PageSection>
      )}

      <PageSection title={t("explore.trendingPosts")} icon={TrendingUp}>
        {trendingPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("explore.trendingEmpty")}</p>
        ) : (
          <div className="space-y-2 moco-stagger">
            {trendingPosts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`}>
                <Card className="folk-card-interactive hover:bg-muted/30 rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DisplayNameWithSupportTier
                        name={userDisplayName(p.author)}
                        tier={p.author.supportTierSent ?? "SEED"}
                        nameClassName="font-medium"
                        compact
                      />
                      <span className="text-muted-foreground">@{p.author.username}</span>
                    </div>
                    <p className="mt-1 font-medium line-clamp-1">{p.title || p.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      ♥ {p._count.likes} · 💬 {p._count.comments}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection title={t("explore.newUsers")} icon={Users}>
        {suggestedUsers.length === 0 ? (
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/auth/signup">{t("explore.beFirstUser")}</Link>
          </Button>
        ) : (
          <div className="space-y-2 moco-stagger">
            {suggestedUsers.map((u) => (
              <Link key={u.username} href={`/u/${u.username}`}>
                <div className="folk-card-interactive flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 border border-border/50">
                  <Avatar>
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback>{u.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DisplayNameWithSupportTier
                      name={u.name || u.username}
                      tier={u.supportTierSent ?? "SEED"}
                      nameClassName="font-medium"
                      compact
                    />
                    <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
