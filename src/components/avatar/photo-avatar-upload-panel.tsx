"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_AVATAR_SIZE } from "@/lib/photo-avatar/types";
import { createPhotoAvatarFromFile } from "@/lib/photo-avatar/create-from-file";
import {
  clearPhotoAvatarRig,
  getPhotoAvatarRenderMode,
  hasPhotoAvatarRig,
  setPhotoAvatarRenderMode,
} from "@/lib/photo-avatar/photo-avatar-storage";

export function PhotoAvatarUploadPanel({ onReady }: { onReady?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"flat2d" | "photo">(() => {
    if (typeof window === "undefined") return "flat2d";
    return getPhotoAvatarRenderMode() === "photo" ? "photo" : "flat2d";
  });
  const [hasRig, setHasRig] = useState(() =>
    typeof window !== "undefined" ? hasPhotoAvatarRig() : false
  );

  async function onFile(file: File) {
    setLoading(true);
    setError("");
    try {
      await createPhotoAvatarFromFile(file);
      setHasRig(true);
      setMode("photo");
      onReady?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 아바타 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "flat2d" | "photo") {
    if (next === "photo" && !hasRig) {
      setError("먼저 얼굴 사진을 업로드해 주세요.");
      return;
    }
    setPhotoAvatarRenderMode(next);
    setMode(next);
    onReady?.();
  }

  async function removePhotoAvatar() {
    await clearPhotoAvatarRig();
    setHasRig(false);
    setMode("flat2d");
    onReady?.();
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <UserCircle2 className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold">사진 → 버츄얼 (2D)</p>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        정면 얼굴 사진을 올리면 눈·코·입을 자동 인식해 {PHOTO_AVATAR_SIZE}×{PHOTO_AVATAR_SIZE} 아바타를
        만듭니다. 웹캠으로 깜빡임·입 벌림이 연동되고 라이브 시청자에게도 보입니다.
      </p>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => switchMode("flat2d")}
          className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium border ${
            mode === "flat2d" ? "border-primary bg-primary/10 text-primary" : "border-border"
          }`}
        >
          기본 2D
        </button>
        <button
          type="button"
          onClick={() => switchMode("photo")}
          className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium border ${
            mode === "photo" ? "border-primary bg-primary/10 text-primary" : "border-border"
          }`}
        >
          사진 아바타
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        disabled={loading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-lg gap-1 text-xs"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {loading ? "인식 중…" : "갤러리에서 얼굴 사진"}
        </Button>
        {hasRig && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg gap-1 text-xs text-muted-foreground"
            onClick={() => void removePhotoAvatar()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            사진 아바타 삭제
          </Button>
        )}
      </div>

      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {hasRig && mode === "photo" && (
        <p className="text-[10px] text-emerald-600">사진 아바타 활성 — 스튜디오·라이브·OBS에 적용됩니다.</p>
      )}
    </div>
  );
}
