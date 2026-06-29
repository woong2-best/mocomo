"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Sparkles, Camera, Heart } from "lucide-react";
import type { DiscoveryCard } from "@/lib/discovery/types";
import { DISCOVERY_GENDER_LABELS, DISCOVERY_LOOKING_LABELS, normalizeLookingFor } from "@/lib/discovery/constants";
import { cn } from "@/lib/utils";

type Props = {
  card: DiscoveryCard;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
};

export function DiscoveryCardView({ card, className, style, draggable = true }: Props) {
  const displayName = card.name || card.username;
  const hero = card.cosplayPhoto || card.image;

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto aspect-[3/4.2] rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none",
        className
      )}
      style={style}
    >
      {hero ? (
        <Image src={hero} alt="" fill className="object-cover" sizes="400px" priority />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-fuchsia-900 to-rose-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-500/10" />

      <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
        {card.isCosplayer && (
          <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-600/80 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
            <Camera className="h-3 w-3" /> 코스어
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[11px] text-white/90">
          {DISCOVERY_LOOKING_LABELS[normalizeLookingFor(card.lookingFor)]}
        </span>
        {card.matchScore >= 40 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
            <Sparkles className="h-3 w-3" /> 취향 저격
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2 text-white">
        <div className="flex items-end gap-3">
          {card.image && card.cosplayPhoto && (
            <div className="relative h-12 w-12 rounded-full border-2 border-white/80 overflow-hidden shrink-0">
              <Image src={card.image} alt="" fill className="object-cover" sizes="48px" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {draggable ? (
              <Link href={`/u/${card.username}`} className="font-display font-bold text-2xl truncate hover:underline block">
                {displayName}
              </Link>
            ) : (
              <span className="font-display font-bold text-2xl truncate block">{displayName}</span>
            )}
            <p className="text-sm text-white/70">@{card.username}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/80">
          {card.age != null && <span>{card.age}세</span>}
          {card.gender && card.showGender && (
            <span>{DISCOVERY_GENDER_LABELS[card.gender]}</span>
          )}
          {(card.city || card.distanceKm != null) && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {card.distanceKm != null ? `${card.distanceKm}km` : card.city}
            </span>
          )}
        </div>

        {(card.pitch || card.bio) && (
          <p className="text-sm leading-snug line-clamp-3 text-white/90">{card.pitch || card.bio}</p>
        )}

        {card.cosplayCharacter && (
          <p className="text-xs text-fuchsia-200">코스 · {card.cosplayCharacter}</p>
        )}

        {card.mainCharacter && (
          <p className="text-xs text-cyan-200">最愛 · {card.mainCharacter}</p>
        )}

        {card.animeTitles.length > 0 && (
          <p className="text-[11px] text-white/65 truncate">애니 · {card.animeTitles.join(" · ")}</p>
        )}

        {card.favoriteTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {card.favoriteTags.slice(0, 5).map((t) => (
              <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-1/2 right-3 -translate-y-1/2 opacity-0 pointer-events-none sm:opacity-100">
        <Heart className="h-8 w-8 text-pink-400 drop-shadow-lg" />
      </div>
    </div>
  );
}
