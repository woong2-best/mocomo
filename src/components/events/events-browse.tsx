"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Sparkles } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { NativePageTitle } from "@/components/layout/app-page-chrome";
import { Button } from "@/components/ui/button";
import {
  EVENT_CATEGORY_LINE,
  EVENT_FILTER_TAGS,
} from "@/lib/event-registration";
import { cn } from "@/lib/utils";

export type EventsBrowseItem = {
  id: string;
  title: string;
  type: string;
  endsAt: Date | string;
  imageUrl: string | null;
  participantCount: number;
  likeCount?: number;
  linkUrl?: string | null;
};

function parseCover(imageUrl: string | null, images: unknown): string | null {
  if (imageUrl) return imageUrl;
  if (Array.isArray(images)) {
    const first = images.find((u): u is string => typeof u === "string" && u.length > 0);
    return first ?? null;
  }
  return null;
}

export function EventsBrowse({
  events,
  isLoggedIn,
}: {
  events: Array<{
    id: string;
    title: string;
    type: string;
    endsAt: Date | string;
    imageUrl: string | null;
    images?: unknown;
    linkUrl?: string | null;
    _count: { participants: number };
  }>;
  isLoggedIn: boolean;
}) {
  const [filter, setFilter] = useState<string>("all");

  const items: EventsBrowseItem[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        endsAt: e.endsAt,
        imageUrl: parseCover(e.imageUrl, e.images),
        participantCount: e._count.participants,
        likeCount: 0,
        linkUrl: e.linkUrl,
      })),
    [events]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((e) => e.type === filter);
  }, [items, filter]);

  const featured = useMemo(() => {
    const withImage = items.filter((e) => e.imageUrl);
    const pool = withImage.length > 0 ? withImage : items;
    if (pool.length === 0) return null;
    return [...pool].sort(
      (a, b) => b.participantCount - a.participantCount
    )[0];
  }, [items]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <NativePageTitle>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white/95 sm:text-3xl">
              이벤트
            </h1>
            <p className="mt-1.5 text-sm text-white/40">
              {EVENT_CATEGORY_LINE.join(" · ")}
            </p>
          </div>
        </NativePageTitle>
        {isLoggedIn && (
          <Link href="/events/new">
            <Button className="gap-2 rounded-xl bg-[#A855F7] text-white hover:bg-[#C084FC]">
              <PlusCircle className="h-4 w-4" />
              이벤트 등록
            </Button>
          </Link>
        )}
      </header>

      {/* Featured */}
      {featured && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-[#A855F7]" />
            Featured Event
          </div>
          <FeaturedBanner event={featured} />
        </section>
      )}

      {/* Filter tags */}
      <div className="flex flex-wrap gap-2">
        {EVENT_FILTER_TAGS.map((tag) => {
          const active = filter === tag.id;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => setFilter(tag.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-[#A855F7]/20 text-[#C084FC] ring-1 ring-[#A855F7]/50"
                  : "bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white/70"
              )}
            >
              {tag.hash ?? tag.label}
            </button>
          );
        })}
      </div>

      {/* Grid / empty */}
      {filtered.length === 0 ? (
        <EmptyState isLoggedIn={isLoggedIn} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((event) => {
            const card = <EventCard event={event} />;
            if (event.linkUrl) {
              return (
                <a
                  key={event.id}
                  href={event.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60 rounded-2xl"
                >
                  {card}
                </a>
              );
            }
            return <div key={event.id}>{card}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function FeaturedBanner({ event }: { event: EventsBrowseItem }) {
  const inner = (
    <div
      className={cn(
        "relative h-[180px] overflow-hidden rounded-2xl border border-white/[0.08] sm:h-[200px]",
        "bg-[#1B2135] transition-[border-color,box-shadow] duration-200",
        "hover:border-[#A855F7]/40 hover:shadow-[0_12px_40px_-12px_rgba(168,85,247,0.35)]"
      )}
    >
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-[#1B2135] via-[#2a1f45] to-[#141826]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141826]/95 via-[#141826]/55 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
        <p className="text-[11px] font-medium text-[#A855F7]">
          {EVENT_FILTER_TAGS.find((t) => t.id === event.type)?.label ??
            event.type}
        </p>
        <h2 className="mt-1 max-w-md text-lg font-semibold text-white sm:text-xl">
          {event.title}
        </h2>
      </div>
    </div>
  );

  if (event.linkUrl) {
    return (
      <a
        href={event.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]/60"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function EmptyState({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#1B2135]/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#A855F7]/10 ring-1 ring-[#A855F7]/25">
        <Sparkles className="h-7 w-7 text-[#A855F7]" />
      </div>
      <p className="text-base font-medium text-white/90">
        ✨ 아직 진행 중인 이벤트가 없습니다.
      </p>
      <p className="mt-2 text-sm text-white/40">
        첫 번째 이벤트를 등록해보세요.
      </p>
      {isLoggedIn ? (
        <Link href="/events/new" className="mt-6">
          <Button className="gap-2 rounded-xl bg-[#A855F7] text-white hover:bg-[#C084FC]">
            <PlusCircle className="h-4 w-4" />
            이벤트 등록
          </Button>
        </Link>
      ) : (
        <Link href="/auth/signin?callbackUrl=/events/new" className="mt-6">
          <Button
            variant="outline"
            className="gap-2 rounded-xl border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
          >
            로그인하고 등록하기
          </Button>
        </Link>
      )}
    </div>
  );
}
