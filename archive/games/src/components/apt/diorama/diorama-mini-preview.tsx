"use client";

import { memo, useEffect, useState } from "react";
import { getStickerAsset } from "@/lib/diorama/sticker-catalog";
import { getDefaultStickerInstances, getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { loadStickerInstances } from "@/lib/diorama/sticker-storage";
import { DioramaRoomBackdrop } from "@/components/apt/diorama/diorama-room-backdrop";
import { getRoomTheme } from "@/lib/diorama/room-themes";
import { cn } from "@/lib/utils";

function DioramaMiniPreviewInner({
  roomId,
  roomType,
  layoutOwnerUserId,
  className,
}: {
  roomId: string;
  roomType: string;
  layoutOwnerUserId?: string | null;
  className?: string;
}) {
  const [stickers, setStickers] = useState(() => getDefaultStickerInstances(roomId, roomType).slice(0, 8));
  const theme = getRoomTheme(roomType);
  const preset = getDioramaPreset(roomId, roomType);

  useEffect(() => {
    if (!preset) return;
    void loadStickerInstances(roomId).then((saved) => {
      if (saved.instances?.length) setStickers(saved.instances.slice(0, 10));
    });
  }, [roomId, preset]);

  if (!preset) return null;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-2 border-white/70 shadow-lg", className)}>
      <div className="absolute inset-0 scale-[0.45] origin-center">
        <DioramaRoomBackdrop roomType={roomType} />
      </div>
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 30%, ${theme.ambient}, transparent 70%)` }}
      />
      <div className="absolute inset-0">
        {stickers
          .filter((s) => s.typeId !== "room-shell")
          .map((s) => {
            const asset = getStickerAsset(s.typeId);
            if (!asset) return null;
            const w = asset.defaultWidth * (s.scale ?? 1) * 0.35;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.id}
                src={asset.src}
                alt=""
                className="absolute object-contain drop-shadow-md"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: w,
                  transform: `translate(-50%, -50%) rotate(${s.rotation ?? 0}deg)`,
                  zIndex: s.zIndex,
                }}
                draggable={false}
              />
            );
          })}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4a3428]/50 to-transparent px-2 py-2">
        <span className="text-[9px] font-black text-white drop-shadow">{theme.label}</span>
      </div>
    </div>
  );
}

export const DioramaMiniPreview = memo(DioramaMiniPreviewInner);
