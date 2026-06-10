"use client";

import type { WebtoonPublishDay } from "@prisma/client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publishCreatorEpisode } from "@/actions/creator-works";
import { createWebtoonSeries, updateWebtoonPublishDay } from "@/actions/webtoon";
import {
  WEBTOON_DAY_FULL,
  WEBTOON_WEEK_DAYS,
} from "@/lib/webtoon/constants";
import { uploadImageBlob } from "@/lib/client-upload";
import { cn } from "@/lib/utils";

type MyWebtoon = Awaited<
  ReturnType<typeof import("@/actions/creator-works").listMyCreatorSeries>
>[number];

export function WebtoonStudioForm({ myWebtoons }: { myWebtoons: MyWebtoon[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [publishDay, setPublishDay] = useState<WebtoonPublishDay>("MON");
  const [seriesId, setSeriesId] = useState(myWebtoons[0]?.id ?? "");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeNo, setEpisodeNo] = useState(1);
  const [price, setPrice] = useState(500);
  const [freePreviewCount, setFreePreviewCount] = useState(1);
  const [contentUrls, setContentUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function uploadCover(file: File) {
    setLoading(true);
    setErr("");
    try {
      setCoverUrl(await uploadImageBlob(file, file.name));
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

  async function onCreateSeries() {
    setLoading(true);
    setErr("");
    setMsg("");
    const res = await createWebtoonSeries({ title, description, coverUrl, publishDay });
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setSeriesId(res.series!.id);
    setMsg(`「${res.series!.title}」이 ${WEBTOON_DAY_FULL[publishDay]}에 등록되었습니다.`);
  }

  async function onPublishEpisode() {
    if (!seriesId) {
      setErr("먼저 웹툰 시리즈를 만들거나 선택해 주세요.");
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
      previewUrls: contentUrls.slice(0, 1),
      freePreviewCount,
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
  }

  async function onChangePublishDay(id: string, day: WebtoonPublishDay) {
    setLoading(true);
    setErr("");
    const res = await updateWebtoonPublishDay(id, day);
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setMsg("연재 요일이 변경되었습니다.");
  }

  return (
    <div className="space-y-8">
      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">1. 웹툰 시리즈 · 연재 요일</h2>
        <Input placeholder="웹툰 제목" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        <Textarea
          placeholder="소개 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl min-h-[80px]"
        />
        <div className="flex flex-wrap gap-2">
          {WEBTOON_WEEK_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPublishDay(d)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold border",
                publishDay === d
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-muted/50 text-muted-foreground border-border"
              )}
            >
              {WEBTOON_DAY_FULL[d]}
            </button>
          ))}
        </div>
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
          웹툰 등록
        </Button>
      </section>

      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">2. 회차 업로드 · 개별 판매</h2>
        {myWebtoons.length > 0 && (
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {myWebtoons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
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
        <Input
          type="number"
          min={0}
          value={freePreviewCount}
          onChange={(e) => setFreePreviewCount(Number(e.target.value))}
          className="rounded-xl"
        />
        <p className="text-[11px] text-muted-foreground -mt-2">무료 미리보기 장 수</p>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
          <Upload className="h-4 w-4" />
          웹툰 컷 업로드 (여러 장)
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => void uploadPages(e.target.files)}
          />
        </label>
        {contentUrls.length > 0 && <p className="text-xs text-emerald-600">{contentUrls.length}장 업로드됨</p>}
        <Button type="button" className="rounded-xl w-full" disabled={loading} onClick={() => void onPublishEpisode()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "회차 등록 · 판매 시작"}
        </Button>
      </section>

      {myWebtoons.length > 0 && (
        <section className="folk-card p-5 space-y-3">
          <h3 className="font-bold text-sm">내 웹툰 · 연재 요일 변경</h3>
          {myWebtoons.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-3">
              <Link href={`/webtoon/series/${s.id}`} className="font-medium text-sm flex-1 min-w-[120px] hover:text-primary">
                {s.title}
              </Link>
              <select
                defaultValue={(s as MyWebtoon & { publishDay?: WebtoonPublishDay | null }).publishDay ?? "MON"}
                className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                onChange={(e) => void onChangePublishDay(s.id, e.target.value as WebtoonPublishDay)}
                disabled={loading}
              >
                {WEBTOON_WEEK_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {WEBTOON_DAY_FULL[d]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>
      )}

      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
