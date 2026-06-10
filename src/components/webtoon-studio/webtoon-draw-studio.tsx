"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  Download,
  Layers,
  Maximize2,
  Minimize2,
  Palette,
  Redo2,
  Save,
  Undo2,
  Upload,
  Users,
} from "lucide-react";
import { useWebtoonStudio } from "@/hooks/use-webtoon-studio";
import { StudioCanvas } from "@/components/webtoon-studio/studio-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_BRUSHES,
  LAYER_FILTERS,
  SPEECH_BUBBLE_TEMPLATES,
  STUDIO_TOOLS,
} from "@/lib/webtoon-studio/constants";
import { uploadImageBlob } from "@/lib/client-upload";
import { cn } from "@/lib/utils";

const ROADMAP_SECTIONS = [
  { title: "클라우드 · 동기화", items: ["클라우드 저장", "브러시 동기화", "팔레트 동기화", "자동 백업"] },
  { title: "협업", items: ["공동 작업", "권한 관리", "댓글", "작업 요청"] },
  { title: "연재 · 통계", items: ["예약 업로드", "연재 캘린더", "조회·구독 통계", "국가별 통계"] },
  { title: "파일", items: ["PSD 가져오기", "MDP 가져오기", "PSD 내보내기"] },
];

export function WebtoonDrawStudio() {
  const studio = useWebtoonStudio();
  const [panel, setPanel] = useState<"layers" | "color" | "brush" | "manga" | "roadmap">("layers");
  const [fullscreen, setFullscreen] = useState(false);
  const [msg, setMsg] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [episodeNo, setEpisodeNo] = useState(1);
  const [price, setPrice] = useState(0);

  const shellClass = fullscreen
    ? "fixed inset-0 z-[80] bg-background flex flex-col"
    : "flex flex-col min-h-[calc(100dvh-var(--header-h)-8rem)] -mx-3 sm:-mx-4";

  const downloadPng = useCallback(async () => {
    const blob = await studio.exportMergedPngBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${studio.project.name}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [studio]);

  const uploadForEpisode = useCallback(async () => {
    setMsg("");
    try {
      const blob = await studio.exportMergedPngBlob();
      await uploadImageBlob(blob, `${studio.project.name}-${episodeNo}.png`);
      setMsg(`${episodeNo}화 PNG 업로드 완료. 연재·등록 스튜디오에서 회차로 등록하세요.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "업로드 실패");
    }
  }, [episodeNo, studio]);

  return (
    <div className={shellClass}>
      <header className="shrink-0 flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2 bg-card/80">
        <Input
          value={studio.project.name}
          onChange={(e) => studio.renameProject(e.target.value)}
          className="h-8 max-w-[200px] text-sm font-semibold"
        />
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={!studio.canUndo} onClick={studio.undo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" disabled={!studio.canRedo} onClick={studio.redo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => void studio.saveProjectNow()}>
          <Save className="h-3.5 w-3.5" />
          저장
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => void downloadPng()}>
          <Download className="h-3.5 w-3.5" />
          PNG
        </Button>
        <label className="inline-flex">
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1" asChild>
            <span>
              <Upload className="h-3.5 w-3.5" />
              가져오기
            </span>
          </Button>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) studio.importImageToActive(f);
              e.target.value = "";
            }}
          />
        </label>
        <Button type="button" size="sm" className="h-8" onClick={() => setPublishOpen((v) => !v)}>
          회차 업로드
        </Button>
        <div className="ml-auto flex gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Link href="/webtoon/studio">
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs">
              연재 관리
            </Button>
          </Link>
        </div>
      </header>

      {publishOpen && (
        <div className="shrink-0 flex flex-wrap items-end gap-2 px-3 py-2 bg-muted/40 border-b text-xs">
          <label className="space-y-1">
            <span className="text-muted-foreground">회차</span>
            <Input type="number" min={1} value={episodeNo} onChange={(e) => setEpisodeNo(Number(e.target.value))} className="h-8 w-20" />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">가격(원)</span>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-8 w-24" />
          </label>
          <Button type="button" size="sm" className="h-8" onClick={() => void uploadForEpisode()}>
            PNG 업로드
          </Button>
          <p className="text-muted-foreground w-full">시리즈 연결은 웹툰 스튜디오에서 회차 등록 시 선택하세요.</p>
        </div>
      )}
      {msg && <p className="text-xs px-3 py-1 text-emerald-600 shrink-0">{msg}</p>}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-14 shrink-0 border-r border-border/60 bg-muted/20 flex flex-col items-center py-2 gap-1 overflow-y-auto">
          {STUDIO_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => studio.setTool(t.id)}
              className={cn(
                "w-10 h-10 rounded-lg text-[9px] font-bold leading-tight px-0.5",
                studio.tool === t.id ? "bg-red-600 text-white" : "hover:bg-muted"
              )}
            >
              {t.label.slice(0, 4)}
            </button>
          ))}
        </aside>

        <aside className="w-52 shrink-0 border-r border-border/60 flex flex-col min-h-0">
          <div className="flex border-b border-border/40 text-[10px]">
            {(
              [
                ["layers", Layers, "레이어"],
                ["color", Palette, "색"],
                ["brush", Save, "브러시"],
                ["manga", Cloud, "만화"],
                ["roadmap", Users, "로드맵"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className={cn("flex-1 py-2 flex flex-col items-center gap-0.5", panel === id && "bg-muted font-bold")}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2 text-xs space-y-2">
            {panel === "layers" && (
              <>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={studio.addLayer}>
                    + 레이어
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={studio.duplicateActiveLayer}>
                    복제
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={studio.mergeSelectedLayers}>
                    병합
                  </Button>
                </div>
                {[...studio.page.layers].reverse().map((layer, revIdx) => {
                  const idx = studio.page.layers.length - 1 - revIdx;
                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        "rounded-lg border p-2 space-y-1 cursor-pointer",
                        layer.id === studio.activeLayer.id && "border-emerald-500 bg-emerald-500/5"
                      )}
                      onClick={() => studio.setActiveLayerId(layer.id)}
                    >
                      <Input
                        value={layer.name}
                        onChange={(e) => studio.renameLayer(layer.id, e.target.value)}
                        className="h-6 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="px-1 rounded bg-muted" onClick={() => studio.toggleLayerFlag(layer.id, "visible")}>
                          {layer.visible ? "👁" : "—"}
                        </button>
                        <button type="button" className="px-1 rounded bg-muted" onClick={() => studio.toggleLayerFlag(layer.id, "locked")}>
                          {layer.locked ? "🔒" : "🔓"}
                        </button>
                        <button type="button" className="px-1 rounded bg-muted" onClick={() => studio.toggleLayerFlag(layer.id, "alphaLock")}>
                          α
                        </button>
                        <button type="button" className="px-1 rounded bg-muted text-destructive" onClick={() => studio.deleteLayer(layer.id)}>
                          ✕
                        </button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={layer.opacity}
                        onChange={(e) => studio.setLayerOpacity(layer.id, Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex gap-1">
                        <button type="button" className="text-[10px] underline" disabled={idx <= 0} onClick={() => studio.moveLayer(idx, idx - 1)}>
                          ↑
                        </button>
                        <button
                          type="button"
                          className="text-[10px] underline"
                          disabled={idx >= studio.page.layers.length - 1}
                          onClick={() => studio.moveLayer(idx, idx + 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {panel === "color" && (
              <>
                <input type="color" value={studio.color} onChange={(e) => studio.pickColor(e.target.value)} className="w-full h-10 rounded border" />
                <Input value={studio.color} onChange={(e) => studio.pickColor(e.target.value)} className="h-7 font-mono text-[10px]" />
                <p className="font-semibold text-muted-foreground">최근 색상</p>
                <div className="flex flex-wrap gap-1">
                  {studio.recentColors.map((c) => (
                    <button key={c} type="button" className="w-6 h-6 rounded border" style={{ background: c }} onClick={() => studio.pickColor(c)} />
                  ))}
                </div>
              </>
            )}
            {panel === "brush" && (
              <>
                {[...DEFAULT_BRUSHES, ...studio.customBrushes].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      studio.setBrush(b);
                      studio.setTool(b.tool);
                    }}
                    className={cn("w-full text-left rounded-lg border px-2 py-1.5", studio.brush.id === b.id && "border-red-500")}
                  >
                    {b.name}
                  </button>
                ))}
                <Button type="button" size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={studio.createCustomBrush}>
                  + 사용자 브러시
                </Button>
                <label className="block">크기 {studio.brush.size}</label>
                <input type="range" min={1} max={80} value={studio.brush.size} onChange={(e) => studio.setBrush({ ...studio.brush, size: Number(e.target.value) })} className="w-full" />
                <label className="block">불투명도 {studio.brush.opacity}%</label>
                <input type="range" min={1} max={100} value={studio.brush.opacity} onChange={(e) => studio.setBrush({ ...studio.brush, opacity: Number(e.target.value) })} className="w-full" />
                <label className="block">간격 {studio.brush.spacing}</label>
                <input type="range" min={0.02} max={0.5} step={0.01} value={studio.brush.spacing} onChange={(e) => studio.setBrush({ ...studio.brush, spacing: Number(e.target.value) })} className="w-full" />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={studio.brush.pressure} onChange={(e) => studio.setBrush({ ...studio.brush, pressure: e.target.checked })} />
                  필압
                </label>
                <label className="block">손떨림 보정 {studio.brush.stabilization}</label>
                <input type="range" min={0} max={8} value={studio.brush.stabilization} onChange={(e) => studio.setBrush({ ...studio.brush, stabilization: Number(e.target.value) })} className="w-full" />
              </>
            )}
            {panel === "manga" && (
              <>
                <p className="font-semibold">말풍선</p>
                {SPEECH_BUBBLE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cn("w-full rounded border px-2 py-1", studio.speechTemplate === t.id && "border-red-500")}
                    onClick={() => {
                      studio.setSpeechTemplate(t.id);
                      studio.setTool("speechBubble");
                    }}
                  >
                    {t.label}
                  </button>
                ))}
                <p className="font-semibold pt-2">필터 (활성 레이어)</p>
                {LAYER_FILTERS.map((f) => (
                  <button key={f.id} type="button" className="w-full rounded border px-2 py-1 text-left" onClick={() => studio.applyFilterToActive(f.id)}>
                    {f.label}
                  </button>
                ))}
                <Button type="button" size="sm" variant="outline" className="w-full mt-2 h-7" onClick={() => studio.setTool("speedLines")}>
                  속도선 배치
                </Button>
              </>
            )}
            {panel === "roadmap" && (
              <div className="space-y-3 text-[10px] text-muted-foreground">
                {ROADMAP_SECTIONS.map((s) => (
                  <div key={s.title}>
                    <p className="font-bold text-foreground mb-1">{s.title}</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {s.items.map((i) => (
                        <li key={i}>{i} · 준비 중</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <StudioCanvas studio={studio} />
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-border/40 bg-muted/20 text-[10px] overflow-x-auto">
            <span>줌</span>
            <input
              type="range"
              min={0.15}
              max={1.2}
              step={0.05}
              value={studio.viewport.zoom}
              onChange={(e) => studio.setViewport({ ...studio.viewport, zoom: Number(e.target.value) })}
              className="w-24"
            />
            <Button type="button" size="sm" variant="outline" className="h-6 text-[10px]" onClick={studio.addPage}>
              + 페이지
            </Button>
            {studio.project.pages.map((pg, i) => (
              <button
                key={pg.id}
                type="button"
                onClick={() => studio.setActivePageIndex(i)}
                className={cn(
                  "px-2 py-1 rounded border shrink-0",
                  i === studio.project.activePageIndex && "bg-emerald-600 text-white border-emerald-600"
                )}
              >
                {pg.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
