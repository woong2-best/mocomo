"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Loader2 } from "lucide-react";
import {
  AVATAR_2D_CHANGED_EVENT,
  MOCOMO_2D_LIBRARY_NAME,
  getActiveLibraryCharacterId,
  hasLibraryCharacters,
  listLibraryCharacters,
  setActiveLibraryCharacter,
  type Flat2dLibraryCharacterEntry,
} from "@/lib/avatar-2d/library";
import { cn } from "@/lib/utils";

type Live2dLibraryPanelProps = {
  onEquip: (characterId: string) => void | Promise<void>;
  onUnequip?: () => void | Promise<void>;
  equippedId: string | null;
  vtuberActive: boolean;
  compact?: boolean;
};

export function Live2dLibraryPanel({
  onEquip,
  onUnequip,
  equippedId,
  vtuberActive,
  compact = false,
}: Live2dLibraryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<
    (Flat2dLibraryCharacterEntry & { thumbUrl: string })[]
  >([]);
  const [hasLibrary, setHasLibrary] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setHasLibrary(hasLibraryCharacters());
      const list = await listLibraryCharacters();
      setCharacters(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(AVATAR_2D_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(AVATAR_2D_CHANGED_EVENT, onChange);
  }, [refresh]);

  useEffect(() => {
    return () => {
      characters.forEach((c) => URL.revokeObjectURL(c.thumbUrl));
    };
  }, [characters]);

  const handleDoubleClick = async (id: string) => {
    if (equippedId === id && vtuberActive) {
      await onUnequip?.();
      return;
    }
    await setActiveLibraryCharacter(id);
    await onEquip(id);
  };

  if (loading) {
    return (
      <div
        className={
          compact
            ? "flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-2 text-xs text-white/80"
            : "flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground"
        }
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {MOCOMO_2D_LIBRARY_NAME} 불러오는 중…
      </div>
    );
  }

  if (!hasLibrary || characters.length === 0) {
    return (
      <div
        className={
          compact
            ? "rounded-lg bg-black/50 backdrop-blur-sm border border-white/15 px-3 py-2 space-y-1"
            : "rounded-xl border border-dashed border-folk-cobalt/30 bg-muted/20 p-4 space-y-2"
        }
      >
        <p
          className={
            compact
              ? "text-xs font-semibold text-white flex items-center gap-1.5"
              : "text-sm font-semibold text-folk-cobalt flex items-center gap-2"
          }
        >
          <Layers className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {MOCOMO_2D_LIBRARY_NAME}
        </p>
        <p
          className={
            compact
              ? "text-[10px] text-white/70 leading-snug"
              : "text-xs text-muted-foreground leading-relaxed"
          }
        >
          2D 캐릭터를 만들면 여기에 저장됩니다. 더블클릭해 방송에 붙이세요.
        </p>
        <Link
          href="/avatar/studio/2d"
          className={
            compact
              ? "inline-flex text-[10px] font-medium text-violet-300 hover:underline"
              : "inline-flex text-xs font-medium text-primary hover:underline"
          }
        >
          2D 아바타 스튜디오 →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-lg bg-black/50 backdrop-blur-sm border border-white/15 p-2 space-y-2"
          : "rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={
            compact
              ? "text-xs font-semibold text-white flex items-center gap-1.5"
              : "text-sm font-semibold text-folk-cobalt flex items-center gap-2"
          }
        >
          <Layers className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {MOCOMO_2D_LIBRARY_NAME}
        </p>
        <Link
          href="/avatar/studio/2d"
          className={
            compact
              ? "text-[10px] text-violet-300 hover:underline shrink-0"
              : "text-[11px] text-primary hover:underline shrink-0"
          }
        >
          + 더 만들기
        </Link>
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          캐릭터를 <strong className="text-foreground">더블클릭</strong>하면 방송 화면에 붙습니다. 다시
          더블클릭하면 해제됩니다.
        </p>
      )}
      <div
        className={
          compact
            ? "flex gap-2 overflow-x-auto pb-1 max-w-full"
            : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1"
        }
      >
        {characters.map((c) => {
          const active = equippedId === c.id && vtuberActive;
          return (
            <button
              key={c.id}
              type="button"
              onDoubleClick={() => void handleDoubleClick(c.id)}
              className={cn(
                "group relative rounded-xl border-2 overflow-hidden bg-[length:12px_12px] transition-all shrink-0",
                compact ? "h-16 w-16" : "aspect-square",
                "hover:border-folk-terracotta hover:shadow-md active:scale-[0.98]",
                active
                  ? "border-folk-terracotta ring-2 ring-folk-terracotta/40"
                  : compact
                    ? "border-white/30"
                    : "border-border/70"
              )}
              style={{
                backgroundImage:
                  "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)",
              }}
              title={`${c.name} — 더블클릭하여 방송에 적용`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumbUrl} alt={c.name} className="w-full h-full object-contain p-1" />
              {active && (
                <span className="absolute bottom-0 inset-x-0 bg-folk-terracotta/90 text-white text-[9px] font-bold py-0.5">
                  적용 중
                </span>
              )}
              <span className="absolute top-0 inset-x-0 bg-black/50 text-white text-[9px] truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
      {!compact && vtuberFaceHint()}
    </div>
  );
}

function vtuberFaceHint() {
  return (
    <p className="text-[11px] text-muted-foreground leading-relaxed">
      카메라를 정면·상반신까지 비추면 2D 캐릭터가 표정·몸 움직임에 맞춰 살짝 움직입니다.
    </p>
  );
}

export function useLive2dLibraryActiveId() {
  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof window !== "undefined" ? getActiveLibraryCharacterId() : null
  );

  useEffect(() => {
    const sync = () => setActiveId(getActiveLibraryCharacterId());
    sync();
    window.addEventListener(AVATAR_2D_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AVATAR_2D_CHANGED_EVENT, sync);
  }, []);

  return activeId;
}
