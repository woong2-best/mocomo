"use client";

import Link from "next/link";
import {
  Film,
  Hash,
  Loader2,
  Radio,
  Search,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { FastSearchResult, SearchSuggestion } from "@/lib/search-fast";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

function SuggestionIcon({ kind }: { kind: SearchSuggestion["kind"] }) {
  if (kind === "trend") return <TrendingUp className="h-4 w-4 text-folk-terracotta" />;
  if (kind === "anime") return <Film className="h-4 w-4 text-violet-500" />;
  if (kind === "live") return <Radio className="h-4 w-4 text-red-500" />;
  if (kind === "tag") return <Hash className="h-4 w-4 text-folk-cobalt" />;
  return <Search className="h-4 w-4 text-muted-foreground" />;
}

function followLabel(user: FastSearchResult["users"][number]) {
  if (user.isFollowing && user.followsYou) return "서로 팔로우합니다";
  if (user.isFollowing) return "팔로우 중";
  if (user.followsYou) return "나를 팔로우 중";
  return null;
}

export function SearchPreviewPanel({
  trimmed,
  pending,
  results,
  hasHits,
  onClose,
  onFullSearch,
  className,
  style,
}: {
  trimmed: string;
  pending: boolean;
  results: FastSearchResult | null;
  hasHits: boolean;
  onClose: () => void;
  onFullSearch: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useLocale();
  const suggestions = results?.suggestions ?? [];
  const users = results?.users ?? [];
  const extraAnimes = (results?.animes ?? []).filter(
    (a) => !suggestions.some((s) => s.id === `anime:${a.slug}`)
  );

  function sublabelFor(s: SearchSuggestion) {
    if (s.sublabel === "culture-wiki") return t("anime.wikiTitle");
    return s.sublabel;
  }

  return (
    <div
      style={style}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl",
        "max-h-[min(72vh,440px)] overflow-y-auto overscroll-contain",
        className
      )}
    >
      {!hasHits && !pending && (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">검색 결과가 없습니다</p>
      )}

      {pending && !results && (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          검색 중…
        </div>
      )}

      {suggestions.length > 0 && (
        <section>
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              onClick={onClose}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70">
                <SuggestionIcon kind={s.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{s.label}</span>
                {s.sublabel && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{sublabelFor(s)}</span>
                )}
              </span>
            </Link>
          ))}
        </section>
      )}

      {users.length > 0 && (
        <>
          {suggestions.length > 0 && <div className="border-t border-border/60" />}
          <section>
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              사람
            </p>
            {users.map((u) => {
              const relation = followLabel(u);
              const displayName = userDisplayName(u);
              return (
                <Link
                  key={u.id}
                  href={`/u/${u.username}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  onClick={onClose}
                >
                  <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border/50">
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback className="text-sm bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <DisplayNameWithSupportTier
                      name={displayName}
                      tier={u.supportTierSent}
                      nameClassName="text-[15px] font-semibold truncate block"
                      compact
                    />
                    <span className="block truncate text-sm text-muted-foreground">@{u.username}</span>
                    {relation && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <UserCheck className="h-3 w-3 shrink-0" />
                        {relation}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </section>
        </>
      )}

      {extraAnimes.length > 0 && (
        <>
          <div className="border-t border-border/60" />
          <section>
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("anime.wikiTitle")}
            </p>
            {extraAnimes.slice(0, 4).map((a) => (
              <Link
                key={a.slug}
                href={`/anime/${a.slug}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={onClose}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                  <Film className="h-4 w-4 text-violet-500" />
                </span>
                <span className="truncate text-[15px] font-medium">{a.title}</span>
              </Link>
            ))}
          </section>
        </>
      )}

      {(results?.liveStreams.length ?? 0) > 0 && (
        <>
          <div className="border-t border-border/60" />
          <section>
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              라이브
            </p>
            {results!.liveStreams.map((ch) => (
              <Link
                key={ch.id}
                href={`/voice/${ch.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={onClose}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                  <Radio className="h-4 w-4 text-red-500" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{ch.name}</span>
                  <span className="text-xs text-red-500 font-medium">LIVE · {ch.category}</span>
                </span>
              </Link>
            ))}
          </section>
        </>
      )}

      {(results?.posts.length ?? 0) > 0 && (
        <>
          <div className="border-t border-border/60" />
          <section>
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              게시물
            </p>
            {results!.posts.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className="block px-4 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={onClose}
              >
                <p className="text-sm line-clamp-2 text-foreground/90">{p.title || p.content}</p>
              </Link>
            ))}
          </section>
        </>
      )}

      <button
        type="button"
        className="w-full px-4 py-3 text-sm font-medium text-folk-cobalt border-t border-border/60 hover:bg-muted/40 transition-colors text-left"
        onClick={onFullSearch}
      >
        「{trimmed}」 전체 검색
      </button>
    </div>
  );
}
