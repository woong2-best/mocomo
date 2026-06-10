"use client";

import type { CreatorWorkKind } from "@prisma/client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCreatorSeries, publishCreatorEpisode } from "@/actions/creator-works";
import { CREATOR_WORK_KIND_LABEL } from "@/lib/creator-work-labels";
import { uploadImageBlob, uploadVideoBlob } from "@/lib/client-upload";
import { cn } from "@/lib/utils";

type MySeries = Awaited<ReturnType<typeof import("@/actions/creator-works").listMyCreatorSeries>>;

export function CreatorStudioForm({ mySeries }: { mySeries: MySeries }) {
  const [kind, setKind] = useState<CreatorWorkKind>("WEBTOON");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [seriesId, setSeriesId] = useState(mySeries[0]?.id ?? "");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeNo, setEpisodeNo] = useState(1);
  const [price, setPrice] = useState(500);
  const [freePreviewCount, setFreePreviewCount] = useState(1);
  const [contentUrls, setContentUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const selected = mySeries.find((s) => s.id === seriesId);
  const activeKind = selected?.kind ?? kind;

  async function uploadCover(file: File) {
    setLoading(true);
    setErr("");
    try {
      const url = await uploadImageBlob(file, file.name);
      setCoverUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "표지 업로드 실패");
    } finally {
      setLoading(false);
    }
  }

  async function uploadPages(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    setErr("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadImageBlob(file, file.name));
      }
      setContentUrls((prev) => [...prev, ...urls]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "이미지 업로드 실패");
    } finally {
      setLoading(false);
    }
  }

  async function uploadVideo(file: File) {
    setLoading(true);
    setErr("");
    try {
      const url = await uploadVideoBlob(file, file.name);
      setVideoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "영상 업로드 실패");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateSeries() {
    setLoading(true);
    setErr("");
    setMsg("");
    const res = await createCreatorSeries({ title, description, coverUrl, kind });
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setSeriesId(res.series!.id);
    setMsg(`「${res.series!.title}」 시리즈가 만들어졌습니다. 이제 회차를 올리세요.`);
  }

  async function onPublishEpisode() {
    if (!seriesId) {
      setErr("먼저 시리즈를 만들거나 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    const res = await publishCreatorEpisode({
      seriesId,
      title: episodeTitle,
      episodeNo,
      price,
      contentUrls,
      videoUrl: activeKind === "VIDEO" ? videoUrl : undefined,
      previewUrls: contentUrls.slice(0, 1),
      freePreviewCount: activeKind === "VIDEO" ? 0 : freePreviewCount,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setMsg(`${episodeNo}화가 등록되었습니다.`);
    setEpisodeNo((n) => n + 1);
    setEpisodeTitle("");
    setContentUrls([]);
    setVideoUrl("");
  }

  return (
    <div className="space-y-8">
      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">1. 시리즈 만들기</h2>
        <div className="flex flex-wrap gap-2">
          {(["WEBTOON", "PHOTO", "VIDEO"] as CreatorWorkKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold border",
                kind === k
                  ? "bg-folk-cobalt text-white border-folk-cobalt"
                  : "bg-muted/50 text-muted-foreground border-border"
              )}
            >
              {CREATOR_WORK_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <Input placeholder="작품 제목" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        <Textarea
          placeholder="소개 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl min-h-[80px]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
            <Upload className="h-4 w-4" />
            표지 업로드
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadCover(f);
                e.target.value = "";
              }}
            />
          </label>
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-16 w-16 rounded-lg object-cover border" />
          )}
        </div>
        <Button type="button" className="rounded-xl gap-2" disabled={loading} onClick={() => void onCreateSeries()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          시리즈 생성
        </Button>
      </section>

      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">2. 회차·작품 등록</h2>
        {mySeries.length > 0 && (
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {mySeries.map((s) => (
              <option key={s.id} value={s.id}>
                [{CREATOR_WORK_KIND_LABEL[s.kind]}] {s.title}
              </option>
            ))}
          </select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={1}
            placeholder="회차"
            value={episodeNo}
            onChange={(e) => setEpisodeNo(Number(e.target.value))}
            className="rounded-xl"
          />
          <Input
            type="number"
            min={0}
            step={100}
            placeholder="가격(원)"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="rounded-xl"
          />
        </div>
        <Input
          placeholder="회차 제목 (선택)"
          value={episodeTitle}
          onChange={(e) => setEpisodeTitle(e.target.value)}
          className="rounded-xl"
        />
        {activeKind !== "VIDEO" && (
          <>
            <Input
              type="number"
              min={0}
              value={freePreviewCount}
              onChange={(e) => setFreePreviewCount(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground -mt-2">무료 미리보기 장 수 (웹툰·사진)</p>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
              <Upload className="h-4 w-4" />
              {activeKind === "WEBTOON" ? "웹툰 컷 업로드 (여러 장)" : "사진 업로드 (여러 장)"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => void uploadPages(e.target.files)}
              />
            </label>
            {contentUrls.length > 0 && (
              <p className="text-xs text-emerald-600">{contentUrls.length}장 업로드됨</p>
            )}
          </>
        )}
        {activeKind === "VIDEO" && (
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
            <Upload className="h-4 w-4" />
            영상 업로드
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadVideo(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {videoUrl && <p className="text-xs text-emerald-600 truncate">영상 업로드 완료</p>}
        <Button type="button" className="rounded-xl w-full" disabled={loading} onClick={() => void onPublishEpisode()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "회차 등록 · 판매 시작"}
        </Button>
      </section>

      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      {mySeries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">내 시리즈</h3>
          {mySeries.map((s) => (
            <Link
              key={s.id}
              href={`/works/series/${s.id}`}
              className="block rounded-xl border border-border/60 p-3 hover:border-primary/40"
            >
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {CREATOR_WORK_KIND_LABEL[s.kind]} · {s.episodes.length}화
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
