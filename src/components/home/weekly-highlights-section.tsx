"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { userDisplayName } from "@/lib/user-public-select";
import { formatNumber } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { WeeklyHighlightPost } from "@/lib/weekly-highlights";

const HIGHLIGHT_GRID =
  "grid grid-cols-[1.75rem_minmax(0,1fr)_5.5rem_3.25rem] items-center gap-x-2";

function HighlightRow({
  post,
  rank,
  stat,
  statLabel,
}: {
  post: WeeklyHighlightPost;
  rank: number;
  stat: number;
  statLabel: string;
}) {
  const displayName = userDisplayName(post.author);
  const preview = post.title?.trim() || post.content.trim();
  const hasMedia = post.media.length > 0;
  const comments = post._count.comments;

  return (
    <Link
      href={`/post/${post.id}`}
      className={`${HIGHLIGHT_GRID} border-b border-border/70 px-2.5 py-[7px] text-[13px] leading-snug last:border-b-0 hover:bg-muted/40`}
    >
      <span
        className={
          rank === 1
            ? "text-center text-[12px] font-bold tabular-nums text-[#d63a3a]"
            : "text-center text-[12px] font-medium tabular-nums text-muted-foreground"
        }
      >
        {rank}
      </span>

      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-[#1a4db3] hover:underline dark:text-[#6b9fff]">
          {preview}
        </span>
        {comments > 0 && (
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#d63a3a]">
            [{formatNumber(comments)}]
          </span>
        )}
        {hasMedia && (
          <ImageIcon
            className="h-3 w-3 shrink-0 text-emerald-700 dark:text-emerald-400"
            aria-hidden
          />
        )}
      </span>

      <span className="truncate text-right text-[11px] text-muted-foreground">
        {displayName}
      </span>

      <span className="text-right text-[12px] font-medium tabular-nums text-foreground/85">
        <span className="sr-only">{statLabel} </span>
        {formatNumber(stat)}
      </span>
    </Link>
  );
}

function HighlightColumn({
  title,
  posts,
  kind,
  likesLabel,
  viewsLabel,
  emptyLabel,
  splitPosition,
}: {
  title: string;
  posts: WeeklyHighlightPost[];
  kind: "likes" | "views";
  likesLabel: string;
  viewsLabel: string;
  emptyLabel: string;
  splitPosition: "left" | "right";
}) {
  const statLabel = kind === "likes" ? likesLabel : viewsLabel;
  const splitBorder =
    splitPosition === "left"
      ? "border-b border-border/70 lg:border-b-0 lg:border-r"
      : "";

  return (
    <div className={`min-w-0 ${splitBorder} border-border/70`}>
      <div
        className={`${HIGHLIGHT_GRID} border-b border-border/70 bg-muted/55 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground`}
      >
        <span className="text-center">#</span>
        <h3 className="text-[13px] font-bold tracking-tight text-foreground">{title}</h3>
        <span />
        <span className="text-right">{statLabel}</span>
      </div>
      {posts.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div>
          {posts.map((post, i) => (
            <HighlightRow
              key={post.id}
              post={post}
              rank={i + 1}
              stat={kind === "likes" ? post.weeklyLikes : post.viewCount}
              statLabel={statLabel}
            />
          ))}
        </div>
      )}
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
      <div className="mb-2 flex items-end justify-between gap-2 border-b border-border/80 pb-1.5">
        <h2 className="text-[15px] font-bold tracking-tight">{t("home.highlightsTitle")}</h2>
        <span className="pb-0.5 text-[11px] text-muted-foreground">{t("home.highlightsMeta")}</span>
      </div>
      <div className="overflow-hidden border border-border/70 bg-card">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <HighlightColumn
            title={likesTitle}
            posts={topLiked}
            kind="likes"
            likesLabel={t("home.likes")}
            viewsLabel={t("home.views")}
            emptyLabel={t("home.highlightsEmpty", { title: likesTitle })}
            splitPosition="left"
          />
          <HighlightColumn
            title={viewsTitle}
            posts={topViewed}
            kind="views"
            likesLabel={t("home.likes")}
            viewsLabel={t("home.views")}
            emptyLabel={t("home.highlightsEmpty", { title: viewsTitle })}
            splitPosition="right"
          />
        </div>
      </div>
    </section>
  );
}
