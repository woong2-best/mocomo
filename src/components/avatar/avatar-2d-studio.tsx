"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Layers, Loader2, Radio, Upload } from "lucide-react";
import { Avatar2dDrawEditor } from "@/components/avatar/avatar-2d-draw-editor";
import { Avatar2dPreview } from "@/components/avatar/avatar-2d-preview";
import { Avatar2dUploadPanel } from "@/components/avatar/avatar-2d-upload-panel";
import { StudioBackLink } from "@/components/avatar/studio-back-link";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { MOCOMO_2D_LIBRARY_NAME } from "@/lib/avatar-2d/library";
import { canvasToPngBlob, registerFlat2dAvatar } from "@/lib/avatar-2d/register-avatar";
import { AVATAR_2D_SIZE } from "@/lib/avatar-2d/types";
import { cn } from "@/lib/utils";

type Tab = "draw" | "upload";

const ROADMAP = [
  "레이어 · PSD · 클라우드 동기화",
  "만화 컷 · 스크린톤 · 말풍선",
  "브러시 상점 · 프리미엄 브러시",
  "협업 · 그룹 프로젝트",
];

export function Avatar2dStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tab, setTab] = useState<Tab>("draw");
  const [registering, setRegistering] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  async function registerFromDraw() {
    const canvas = canvasRef.current;
    if (!canvas) {
      setErr("캔버스가 준비되지 않았습니다.");
      return;
    }
    setRegistering(true);
    setErr("");
    setMsg("");
    try {
      const blob = await canvasToPngBlob(canvas);
      await registerFlat2dAvatar(blob, {
        width: AVATAR_2D_SIZE,
        height: AVATAR_2D_SIZE,
        source: "draw",
      });
      setMsg(`${MOCOMO_2D_LIBRARY_NAME}에 저장되었습니다. 라방에서 더블클릭해 방송에 붙이세요.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="live-page-shell w-full max-w-none space-y-3 sm:space-y-4 pb-nav lg:pb-4 min-h-[calc(100dvh-var(--header-h))]">
      <StudioBackLink />

      <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-cobalt/25 bg-folk-cobalt/10 text-folk-cobalt shrink-0">
          <Layers className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="folk-tag mb-1.5 w-fit">2D</p>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
            2D 아바타
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            사이트에서 그리거나 PNG 업로드 → 투명 PNG로 방송·OBS에 사용
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 border-2 shrink-0">
          <Link href="/avatar/broadcast" target="_blank" rel="noopener noreferrer">
            <Radio className="h-4 w-4" />
            OBS 방송
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        </Button>
      </header>

      <FolkBrushDivider className="opacity-50" />

      <div className="flex gap-1 rounded-xl bg-muted/50 border border-[hsl(var(--folk-cobalt)/0.12)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("draw")}
          className={cn(
            "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
            tab === "draw" ? "bg-card shadow-folk-sm text-folk-cobalt" : "text-muted-foreground"
          )}
        >
          그리기
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={cn(
            "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1",
            tab === "upload" ? "bg-card shadow-folk-sm text-folk-cobalt" : "text-muted-foreground"
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          파일 업로드
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 folk-card p-4 min-h-0">
          {tab === "draw" ? (
            <>
              <Avatar2dDrawEditor onCanvasReady={onCanvasReady} />
              <Button
                type="button"
                className="w-full mt-4 rounded-xl gap-2"
                disabled={registering}
                onClick={() => void registerFromDraw()}
              >
                {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                투명 PNG로 등록 · 방송 적용
              </Button>
            </>
          ) : (
            <Avatar2dUploadPanel
              onRegistered={() =>
                setMsg(`${MOCOMO_2D_LIBRARY_NAME}에 저장되었습니다. 라방에서 더블클릭해 방송에 붙이세요.`)
              }
            />
          )}
          {err && <p className="text-sm text-destructive mt-3">{err}</p>}
          {msg && <p className="text-sm text-emerald-600 mt-3">{msg}</p>}
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="folk-card p-4">
            <h2 className="text-sm font-bold text-folk-cobalt mb-3">{MOCOMO_2D_LIBRARY_NAME}</h2>
            <Avatar2dPreview />
          </div>

          <div className="folk-card p-4 space-y-2">
            <h2 className="text-sm font-bold text-folk-cobalt">지금 사용 가능</h2>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>연필 · 펜 · G펜 · 에어브러시 · 지우개 · 채우기 · 스포이드</li>
              <li>실행 취소 · 다시 실행 (Ctrl+Z / Ctrl+Y)</li>
              <li>PNG/JPG 업로드 → 투명 PNG 저장</li>
              <li>라이브에서 {MOCOMO_2D_LIBRARY_NAME} 더블클릭으로 방송 적용</li>
            </ul>
          </div>

          <div className="folk-card p-4 space-y-2 opacity-80">
            <h2 className="text-sm font-bold text-muted-foreground">추가 예정</h2>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              {ROADMAP.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
