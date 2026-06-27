"use client";

import { memo } from "react";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { getStickerAsset } from "@/lib/diorama/sticker-catalog";
import { cn } from "@/lib/utils";
import { useAptGameRequired } from "./apt-game-context";

const ROOM_META: Record<
  string,
  { emoji: string; accent: string; previewId: string; tag: string }
> = {
  living: { emoji: "🛋️", accent: "from-amber-50 via-orange-50 to-amber-100", previewId: "sofa", tag: "거실" },
  bedroom: { emoji: "🛏️", accent: "from-sky-50 via-indigo-50 to-blue-100", previewId: "bed", tag: "침실" },
  kitchen: { emoji: "🍳", accent: "from-lime-50 via-emerald-50 to-green-100", previewId: "desk", tag: "부엌" },
  bathroom: { emoji: "🛁", accent: "from-cyan-50 via-teal-50 to-sky-100", previewId: "mirror", tag: "욕실" },
};

function AptMultiRoomOverviewInner({ rooms }: { rooms: AptRoom[] }) {
  const { enterRoom, game } = useAptGameRequired();

  const visible = rooms.filter(
    (r) =>
      r.type !== "hall" &&
      r.type !== "balcony" &&
      getDioramaPreset(r.id, r.type)
  );

  return (
    <div className="apt-game-overview pointer-events-auto absolute inset-0 z-[50] overflow-y-auto bg-gradient-to-b from-[#faf3ea] via-[#f0e6d8] to-[#e5d9c8] px-4 pb-28 pt-[calc(max(0.5rem,env(safe-area-inset-top))+4.5rem)]">
      <div className="pointer-events-none absolute inset-0 apt-game-overview-pattern" />

      <div className="relative mx-auto max-w-md">
        <div className="mb-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a08968]">My Home</p>
          <h1 className="mt-1 text-2xl font-black text-[#4a3428]">우리 집</h1>
          <p className="mt-1 text-[11px] font-medium text-[#8b7355]">
            방을 탭해서 들어가고, 가구 탭에서 꾸며 보세요
          </p>
        </div>

        <div className="apt-game-house-card relative mx-auto aspect-[4/5] w-full max-w-[340px]">
          <div className="apt-game-house-iso absolute inset-[6%]">
            <div className="grid h-full grid-cols-2 grid-rows-3 gap-2 p-2.5">
              {visible.map((room, i) => {
                const meta = ROOM_META[room.type] ?? {
                  emoji: "🏠",
                  accent: "from-[#f5efe6] to-[#e8dfd4]",
                  previewId: "plant",
                  tag: room.label,
                };
                const preview = getStickerAsset(meta.previewId);
                const span =
                  room.type === "living"
                    ? "col-span-2 row-span-2"
                    : room.type === "kitchen"
                      ? "col-span-2"
                      : "";
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => enterRoom(room.id)}
                    className={cn(
                      "apt-game-room-tile group relative overflow-hidden rounded-2xl border-2 border-white/60 bg-gradient-to-br shadow-md active:scale-[0.97]",
                      meta.accent,
                      span
                    )}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div className="absolute inset-0 bg-[url('/diorama/stickers/living/room-shell.webp')] bg-[length:85%] bg-center bg-no-repeat opacity-[0.18]" />
                    {preview && (
                      <div className="absolute inset-x-0 bottom-[28%] flex justify-center opacity-80 transition group-active:scale-95">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview.src}
                          alt=""
                          className={cn(
                            "h-auto object-contain drop-shadow-md",
                            room.type === "living" ? "w-[42%]" : "w-[38%]"
                          )}
                        />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-lg bg-white/85 px-2 py-0.5 text-[10px] font-black text-[#5c4033] shadow-sm">
                      {room.label}
                    </span>
                    <span className="absolute right-2 top-2 text-xl drop-shadow-sm">{meta.emoji}</span>
                    <span className="absolute inset-x-2 bottom-2 rounded-xl bg-[#5c4033]/88 py-1.5 text-center text-[10px] font-bold text-white opacity-0 transition group-active:opacity-100">
                      입장하기
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#e8dcc8] bg-white/75 p-3 shadow-sm backdrop-blur-sm">
          <p className="mb-2 text-center text-[10px] font-bold text-[#8b7355]">보유 재화</p>
          <div className="flex justify-center gap-4 text-sm font-black text-[#5c4033]">
            <span>🪙 {game.gold.toLocaleString()}</span>
            <span>💎 {game.gems.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {visible.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => enterRoom(r.id)}
              className="rounded-full border border-[#d4c4b0]/90 bg-white/95 px-4 py-2 text-[11px] font-bold text-[#5c4033] shadow-sm active:scale-95"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const AptMultiRoomOverview = memo(AptMultiRoomOverviewInner);
