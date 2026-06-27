"use client";

import { useCallback, useState } from "react";
import { DioramaStickerRoom } from "@/components/apt/diorama/diorama-sticker-room";
import { cn } from "@/lib/utils";

/** 모바일 편집 UX 녹화·검증용 공개 데모 (로그인 불필요) */
export default function DioramaEditDemoPage() {
  const [editMode, setEditMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const enterEditMode = useCallback(() => {
    setEditMode(true);
    setPaletteOpen(true);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setPaletteOpen(false);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#e8dfd4]">
      <DioramaStickerRoom
        roomId="living"
        roomType="living"
        roomLabel="거실"
        editMode={editMode}
        paletteOpen={paletteOpen}
        onPaletteOpenChange={setPaletteOpen}
        immersive
      />

      <div
        className={cn(
          "pointer-events-auto absolute right-2 z-[70] flex gap-1.5",
          "top-[max(0.35rem,env(safe-area-inset-top))]"
        )}
      >
        {editMode ? (
          <>
            <button
              type="button"
              data-testid="edit-done"
              onClick={exitEditMode}
              className="rounded-xl border border-[#5c4033]/12 bg-white/80 px-3 py-2 text-[10px] font-bold text-[#5c4033] shadow-sm backdrop-blur-sm active:scale-95"
            >
              완료
            </button>
            <button
              type="button"
              data-testid="edit-palette"
              onClick={() => setPaletteOpen((v) => !v)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm backdrop-blur-sm active:scale-95",
                paletteOpen
                  ? "border-pink-400/50 bg-pink-50/95"
                  : "border-[#5c4033]/12 bg-white/80"
              )}
              aria-label="가구 목록"
            >
              <span className="text-lg leading-none">📦</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            data-testid="edit-enter"
            onClick={enterEditMode}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-[#5c4033]/12 bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-sm active:scale-95"
            aria-label="꾸미기 모드"
          >
            <span className="text-lg leading-none">📦</span>
            <span className="text-[8px] font-bold leading-none text-[#5c4033]">꾸미기</span>
          </button>
        )}
      </div>
    </div>
  );
}
