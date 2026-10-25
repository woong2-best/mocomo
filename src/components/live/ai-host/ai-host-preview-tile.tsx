"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LiveHostAvatar } from "@/components/live/live-host-avatar";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { useLocale } from "@/components/providers/locale-provider";
import { LiveThumbnailLiveBadge } from "@/components/live/live-thumbnail-live-badge";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";

const MocoVrmStage = dynamic(
  () => import("@/components/live/ai-host/moco-vrm-stage").then((m) => m.MocoVrmStage),
  { ssr: false },
);

export function AiHostPreviewTile({
  href,
  vrmUrl,
  backdropUrl,
  posterUrl,
  avatarUrl,
  characterId,
  nameKey,
  titleKey,
  profileUsername,
  displayName,
}: {
  href: string;
  vrmUrl: string;
  backdropUrl?: string | null;
  posterUrl?: string | null;
  avatarUrl?: string | null;
  characterId?: string | null;
  nameKey: string;
  titleKey: string;
  profileUsername?: string | null;
  displayName?: string | null;
}) {
  const { t, locale } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const [showVrm, setShowVrm] = useState(false);
  const username = profileUsername?.trim() || "";
  const name = displayName?.trim() || t(nameKey);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShowVrm(true);
      },
      { rootMargin: "160px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  return (
    <div className="group min-w-0">
      <Link href={href} prefetch={false} className="block min-w-0">
        <div
          ref={hostRef}
          className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40 bg-cover bg-center shadow-sm"
          style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
        >
          {!backdropUrl && posterUrl ? (
            <img
              src={posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          {showVrm ? (
            <MocoVrmStage framing="bust" vrmUrl={vrmUrl} backdropUrl={backdropUrl} characterId={characterId} />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
          <LiveThumbnailLiveBadge className="absolute top-2.5 left-2.5" />
        </div>
      </Link>
      <div className="mt-2.5 flex min-w-0 gap-2.5">
        <LiveHostAvatar username={username} name={name} image={avatarUrl} />
        <div className="min-w-0 flex-1 space-y-0.5">
          {username ? (
            <UserProfileLink username={username} className="block truncate text-sm font-semibold text-white hover:underline">
              {name}
            </UserProfileLink>
          ) : (
            <p className="truncate text-sm font-semibold text-white">{name}</p>
          )}
          <Link href={href} prefetch={false} className="line-clamp-1 text-[13px] text-white/65 hover:text-white">
            {t(titleKey)}
          </Link>
          <span className="inline-flex rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
            {localizedLiveCategoryLabel("JUST_CHATTING", locale)}
          </span>
        </div>
      </div>
    </div>
  );
}
