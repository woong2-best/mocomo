"use client";

import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import { formatNumber } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { WeeklyHighlightPost } from "@/lib/weekly-highlights";

function HighlightCard({
  post,
  stat,
  statIcon: StatIcon,
  statLabel,
}: {
  post: WeeklyHighlightPost;
  stat: number;
  statIcon: typeof Heart;
  statLabel: string;
}) {
  const displayName = userDisplayName(post.author);
  const thumb = post.media[0]?.url;
  const preview = post.title?.trim() || post.content.trim();

  return (
    <Link
      href={`/post/${post.id}`}
      className="flex gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition-all group min-w-0"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-muted/50">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <p className="text-[10px] text-muted-foreground line-clamp-4 leading-tight">{preview}</p>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <div>
          <p className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {preview}
          </p>
          <div className="mt-1.5">
            <DisplayNameWithSupportTier
              name={displayName}
              tier={post.author.supportTierSent}
              nameClassName="text-xs text-muted-foreground"
              compact
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <StatIcon className="h-3.5 w-3.5 text-primary" />
            {formatNumber(stat)}
            <span className="font-normal text-muted-foreground">{statLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {formatNumber(post._count.comments)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function HighlightColumn({
  title,
  icon: Icon,
  posts,
  kind,
  likesLabel,
  viewsLabel,
  emptyLabel,
}: {
  title: string;
  icon: typeof Heart;
  posts: WeeklyHighlightPost[];
  kind: "likes" | "views";
  likesLabel: string;
  viewsLabel: string;
  emptyLabel: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="space-y-2">
        {posts.map((post) => (
          <HighlightCard
            key={post.id}
            post={post}
            stat={kind === "likes" ? post.weeklyLikes : post.viewCount}
            statIcon={kind === "likes" ? Heart : Eye}
            statLabel={kind === "likes" ? likesLabel : viewsLabel}
          />
        ))}
      </div>
    </div>
  );
}

export function WeeklyHighlightsSection({
  topLiked,
  topViewed,
}: {
  topLiked: WeeklyHighlightPost[];
  topViewed: WeeklyHighlightPost[];
}) {
  const { t } = useLocale();

  if (topLiked.length === 0 && topViewed.length === 0) return null;

  const likesTitle = t("home.likesTop");
  const viewsTitle = t("home.viewsTop");

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("home.highlightsTitle")}</h2>
        <span className="text-[11px] text-muted-foreground">{t("home.highlightsMeta")}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HighlightColumn
          title={likesTitle}
          icon={Heart}
          posts={topLiked}
          kind="likes"
          likesLabel={t("home.likes")}
          viewsLabel={t("home.views")}
          emptyLabel={t("home.highlightsEmpty", { title: likesTitle })}
        />
        <HighlightColumn
          title={viewsTitle}
          icon={Eye}
          posts={topViewed}
          kind="views"
          likesLabel={t("home.likes")}
          viewsLabel={t("home.views")}
          emptyLabel={t("home.highlightsEmpty", { title: viewsTitle })}
        />
      </div>
    </section>
  );
}
