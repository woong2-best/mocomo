"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Info, Camera } from "lucide-react";
import type { DiscoveryCard } from "@/lib/discovery/types";
import { DISCOVERY_GENDER_LABELS, DISCOVERY_LOOKING_LABELS, normalizeLookingFor } from "@/lib/discovery/constants";
import { cn } from "@/lib/utils";

type Props = {
  card: DiscoveryCard;
  className?: string;
  style?: React.CSSProperties;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

export function DiscoveryCardView({ card, className, style, expanded, onToggleExpand }: Props) {
  const displayName = card.name || card.username;
  const gallery =
    card.photos?.length > 0
      ? card.photos
      : [card.cosplayPhoto, card.image].filter((u): u is string => !!u);
  const [photoIdx, setPhotoIdx] = useState(0);
  const safeIdx = gallery.length > 0 ? Math.min(photoIdx, gallery.length - 1) : 0;
  const hero = gallery[safeIdx] ?? null;

  function prevPhoto(e: React.MouseEvent) {
    e.stopPropagation();
    if (gallery.length < 2) return;
    setPhotoIdx((i) => (i - 1 + gallery.length) % gallery.length);
  }

  function nextPhoto(e: React.MouseEvent) {
    e.stopPropagation();
    if (gallery.length < 2) return;
    setPhotoIdx((i) => (i + 1) % gallery.length);
  }

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-[1.75rem] overflow-hidden select-none",
        "bg-[#1a1a1a] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/10",
        className
      )}
      style={style}
    >
      {hero ? (
        <Image
          src={hero}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 480px) 100vw, 420px"
          priority
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-rose-900 via-neutral-900 to-orange-950" />
      )}

      {/* Photo tap zones */}
      {gallery.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 사진"
            className="absolute inset-y-0 left-0 w-1/3 z-20"
            onClick={prevPhoto}
          />
          <button
            type="button"
            aria-label="다음 사진"
            className="absolute inset-y-0 right-0 w-1/3 z-20"
            onClick={nextPhoto}
          />
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
            {gallery.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-colors",
                  i === safeIdx ? "bg-white" : "bg-white/35"
                )}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10 pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-6 text-white space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-black text-[1.75rem] leading-tight tracking-tight truncate">
              {displayName}
              {card.age != null && (
                <span className="font-semibold text-[1.55rem]">, {card.age}</span>
              )}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-white/80">
              {card.isCosplayer && (
                <span className="inline-flex items-center gap-1 text-rose-200">
                  <Camera className="h-3.5 w-3.5" /> 코스어
                </span>
              )}
              <span>{DISCOVERY_LOOKING_LABELS[normalizeLookingFor(card.lookingFor)]}</span>
              {card.gender && card.showGender && (
                <span>{DISCOVERY_GENDER_LABELS[card.gender]}</span>
              )}
              {(card.city || card.distanceKm != null) && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {card.distanceKm != null ? `${card.distanceKm}km` : card.city}
                </span>
              )}
            </div>
          </div>
          {onToggleExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="shrink-0 h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25 hover:bg-white/25"
              aria-label="상세 정보"
            >
              <Info className="h-5 w-5" />
            </button>
          )}
        </div>

        {(card.pitch || card.bio) && (
          <p
            className={cn(
              "text-[14px] leading-snug text-white/90",
              expanded ? "line-clamp-6" : "line-clamp-2"
            )}
          >
            {card.pitch || card.bio}
          </p>
        )}

        {expanded && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-200">
            {card.cosplayCharacter && (
              <p className="text-xs text-rose-200">코스 · {card.cosplayCharacter}</p>
            )}
            {card.mainCharacter && (
              <p className="text-xs text-sky-200">最愛 · {card.mainCharacter}</p>
            )}
            {card.animeTitles.length > 0 && (
              <p className="text-xs text-white/70">애니 · {card.animeTitles.join(" · ")}</p>
            )}
            {card.favoriteTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {card.favoriteTags.slice(0, 6).map((t) => (
                  <span key={t} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px]">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
