"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onPlayingChange: (playing: boolean) => void;
};

export function GramophonePanel({ open, onClose, onPlayingChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    onPlayingChange(false);
  }, [onPlayingChange]);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.click(), 120);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      stopAudio();
      return;
    }
    return () => {
      stopAudio();
      revokeUrl();
      audioRef.current = null;
    };
  }, [open, revokeUrl, stopAudio]);

  const onFile = async (file: File | null) => {
    setError(null);
    if (!file) return;
    const isMp3 =
      file.type === "audio/mpeg" ||
      file.type === "audio/mp3" ||
      file.name.toLowerCase().endsWith(".mp3");
    if (!isMp3) {
      setError("MP3 파일만 재생할 수 있어요.");
      return;
    }

    stopAudio();
    revokeUrl();
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const audio = new Audio(url);
    audio.loop = true;
    audioRef.current = audio;
    setFileName(file.name);

    audio.onended = () => {
      setPlaying(false);
      onPlayingChange(false);
    };

    try {
      await audio.play();
      setPlaying(true);
      onPlayingChange(true);
    } catch {
      setError("재생을 시작할 수 없어요. 다시 시도해 주세요.");
      setPlaying(false);
      onPlayingChange(false);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      inputRef.current?.click();
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
      onPlayingChange(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
        onPlayingChange(true);
      } catch {
        setError("재생을 시작할 수 없어요.");
      }
    }
  };

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-3 top-14 z-30 mx-auto max-w-sm">
      <div className="rounded-2xl border-2 border-amber-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-folk-cobalt">그라모폰</p>
              <p className="text-[10px] text-muted-foreground">MP3를 넣으면 스피커에서 음악이 나와요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-neutral-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,.mp3"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/60 py-3 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-50"
          >
            <Upload className="h-4 w-4" />
            MP3 파일 선택
          </button>

          {fileName && (
            <p className="truncate text-center text-[10px] text-muted-foreground" title={fileName}>
              {fileName}
            </p>
          )}

          {error && <p className="text-center text-[10px] font-medium text-red-500">{error}</p>}

          <button
            type="button"
            onClick={() => void togglePlay()}
            disabled={!fileName && !playing}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-colors",
              fileName || playing
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-neutral-300 cursor-not-allowed"
            )}
          >
            {playing ? (
              <>
                <Pause className="h-4 w-4" />
                일시정지
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                재생
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
