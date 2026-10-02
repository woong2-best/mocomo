"use client";

import { Tag } from "lucide-react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import {
  IDENTITY_ARCHETYPE_LABELS,
  IDENTITY_TAG_PRESETS,
  inferArchetypeFromHome,
  type AptHomeIdentity,
  type HomeIdentityArchetype,
} from "@/lib/apt/home-identity";
import { BONDEE_FURNITURE_LABELS, type BondeeHomeState } from "@/lib/apt/bondee/types";
import { cn } from "@/lib/utils";

export function AptHomeIdentityPanel({
  state,
  rooms,
  onChange,
  onPreviewShowcase,
}: {
  state: BondeeHomeState;
  rooms: AptRoom[];
  onChange: (identity: AptHomeIdentity) => void;
  onPreviewShowcase?: () => void;
}) {
  const identity = state.identity ?? { tags: [] };
  const inferred = inferArchetypeFromHome(state);
  const selectedArchetype = identity.archetype ?? inferred;
  const showcaseRoomId = identity.showcaseRoomId ?? state.activeRoomId;

  const update = (patch: Partial<AptHomeIdentity>) => {
    onChange({
      ...identity,
      tags: identity.tags ?? [],
      ...patch,
    });
  };

  const toggleTag = (label: string, archetype?: HomeIdentityArchetype) => {
    const has = identity.tags.includes(label);
    const next = has ? identity.tags.filter((t) => t !== label) : [...identity.tags, label].slice(0, 4);
    if (!has && next.length === 1 && archetype && !identity.archetype) {
      update({ tags: next, archetype });
      return;
    }
    update({ tags: next });
  };

  const roomItems = state.items.filter((i) => i.roomId === showcaseRoomId);

  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="font-bold text-white/90 flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" />
          집 정체성
        </p>
        <p className="text-[10px] text-white/50 mt-1">방문자가 「그 사람 집」으로 기억하게 만드세요</p>
      </div>

      <div>
        <p className="text-[10px] font-bold text-white/50 mb-1">집 분위기</p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(IDENTITY_ARCHETYPE_LABELS) as HomeIdentityArchetype[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ archetype: key })}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                selectedArchetype === key
                  ? "border-pink-400/60 bg-pink-500/25 text-pink-100"
                  : "border-white/15 text-white/65 hover:bg-white/10"
              )}
            >
              {IDENTITY_ARCHETYPE_LABELS[key]}
            </button>
          ))}
        </div>
        {!identity.archetype && (
          <p className="text-[10px] text-white/40 mt-1">자동 추론: {IDENTITY_ARCHETYPE_LABELS[inferred]}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold text-white/50 mb-1">대표 태그 (최대 4)</p>
        <div className="flex flex-wrap gap-1">
          {IDENTITY_TAG_PRESETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.label, t.archetype)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                identity.tags.includes(t.label)
                  ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
                  : "border-white/15 text-white/65"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-white/50 mb-1">한 줄 소개</p>
        <input
          type="text"
          maxLength={48}
          value={identity.tagline ?? ""}
          onChange={(e) => update({ tagline: e.target.value })}
          placeholder="예: 밤마다 재즈 틀어두는 집"
          className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-[11px] text-white placeholder:text-white/35"
        />
      </div>

      <div>
        <p className="text-[10px] font-bold text-white/50 mb-1">대표 공간</p>
        <div className="flex flex-wrap gap-1">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => update({ showcaseRoomId: r.id, showcaseItemId: undefined })}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                showcaseRoomId === r.id
                  ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                  : "border-white/15 text-white/65"
              )}
            >
              {r.label ?? r.id}
            </button>
          ))}
        </div>
      </div>

      {roomItems.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-white/50 mb-1">대표 가구 / 작품</p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {roomItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => update({ showcaseItemId: item.id, showcaseRoomId: item.roomId })}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  identity.showcaseItemId === item.id
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                    : "border-white/15 text-white/65"
                )}
              >
                {BONDEE_FURNITURE_LABELS[item.kind]}
              </button>
            ))}
          </div>
        </div>
      )}

      {onPreviewShowcase && (
        <button
          type="button"
          onClick={onPreviewShowcase}
          className="w-full rounded-xl border border-amber-400/30 bg-amber-500/15 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-500/25"
        >
          대표 공간 미리보기
        </button>
      )}
    </div>
  );
}
