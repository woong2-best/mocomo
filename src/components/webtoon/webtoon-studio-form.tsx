"use client";

import type { WebtoonGenre } from "@prisma/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publishCreatorEpisode } from "@/actions/creator-works";
import { createWebtoonSeries, updateWebtoonGenre } from "@/actions/webtoon";
import { WEBTOON_GENRE_LABEL, WEBTOON_GENRES } from "@/lib/webtoon/constants";
import { uploadImageBlob } from "@/lib/client-upload";
import { cn } from "@/lib/utils";

type MyWebtoon = Awaited<
  ReturnType<typeof import("@/actions/creator-works").listMyCreatorSeries>
>[number];

export function WebtoonStudioForm({ myWebtoons }: { myWebtoons: MyWebtoon[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [genre, setGenre] = useState<WebtoonGenre>("FANTASY");
  const [seriesId, setSeriesId] = useState(myWebtoons[0]?.id ?? "");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeNo, setEpisodeNo] = useState(1);
  const [price, setPrice] = useState(1000);
  const [freePreviewCount, setFreePreviewCount] = useState(0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [contentUrls, setContentUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const selected = myWebtoons.find((s) => s.id === seriesId);
    if (!selected) return;
    const maxNo = selected.episodes.reduce((m, e) => Math.max(m, e.episodeNo), 0);
    setEpisodeNo(maxNo + 1);
  }, [seriesId, myWebtoons]);

  async function uploadCover(file: File) {
    setLoading(true);
    setErr("");
    try {
      setCoverUrl(await uploadImageBlob(file, file.name));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "대표 이미지 업로드 실패");
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
      if (!coverUrl && urls[0]) setCoverUrl(urls[0]);
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
    const res = await createWebtoonSeries({ title, description, coverUrl, genre });
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setSeriesId(res.series!.id);
    setMsg(`포트폴리오 「${res.series!.title}」가 만들어졌습니다.`);
  }

  async function onPublishEpisode() {
    if (!seriesId) {
      setErr("먼저 포트폴리오를 만들거나 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    const res = await publishCreatorEpisode({
      seriesId,
      title: episodeTitle.trim() || `작품 ${episodeNo}`,
      episodeNo,
      price,
      contentUrls,
      previewUrls: contentUrls.slice(0, Math.max(1, freePreviewCount || 1)),
      freePreviewCount,
      scheduledAt: scheduledAt.trim() || null,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setMsg("작품이 등록되었습니다. 일러스트 마켓에 노출됩니다.");
    setEpisodeNo((n) => n + 1);
    setEpisodeTitle("");
    setContentUrls([]);
  }

  async function onChangeGenre(id: string, nextGenre: WebtoonGenre) {
    setLoading(true);
    setErr("");
    const res = await updateWebtoonGenre(id, nextGenre);
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setMsg("태그(장르)가 변경되었습니다.");
  }

  return (
    <div className="space-y-8">
      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">1. 포트폴리오 만들기</h2>
        <p className="text-xs text-muted-foreground">
          작품을 묶을 폴더입니다. 예: 「2026 일러스트」「OC 모음」
        </p>
        <Input placeholder="포트폴리오 이름" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        <Textarea
          placeholder="소개 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl min-h-[80px]"
        />
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">태그 · 장르</p>
          <div className="flex flex-wrap gap-2">
            {WEBTOON_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  genre === g
                    ? "border-[#0096fa] bg-[#0096fa] text-white"
                    : "border-border/70 bg-muted/40 text-foreground hover:bg-muted/70"
                )}
              >
                {WEBTOON_GENRE_LABEL[g]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
            <Upload className="h-4 w-4" />
            대표 이미지
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
        <Button type="button" className="rounded-xl gap-2 bg-[#0096fa] hover:bg-[#0086e0]" disabled={loading} onClick={() => void onCreateSeries()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          포트폴리오 만들기
        </Button>
      </section>

      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">2. 그림 판매 등록</h2>
        <p className="text-xs text-muted-foreground">
          일러스트·콘티·다장 업로드 가능. 가격을 0원으로 두면 무료 공개 작품입니다.
        </p>
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
        <Input
          placeholder="작품 제목"
          value={episodeTitle}
          onChange={(e) => setEpisodeTitle(e.target.value)}
          className="rounded-xl"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="가격(원)"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground mt-1">0원 = 무료</p>
          </div>
          <div>
            <Input
              type="number"
              min={0}
              value={freePreviewCount}
              onChange={(e) => setFreePreviewCount(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground mt-1">미구매 시 공개 장 수</p>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">예약 공개 (선택)</span>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="rounded-xl"
          />
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
          <Upload className="h-4 w-4" />
          그림 업로드 (여러 장 가능)
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => void uploadPages(e.target.files)}
          />
        </label>
        {contentUrls.length > 0 && <p className="text-xs text-[#0096fa]">{contentUrls.length}장 업로드됨</p>}
        <Button
          type="button"
          className="rounded-xl w-full bg-[#0096fa] hover:bg-[#0086e0]"
          disabled={loading}
          onClick={() => void onPublishEpisode()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "작품 등록 · 판매 시작"}
        </Button>
      </section>

      {myWebtoons.length > 0 && (
        <section className="folk-card p-5 space-y-3">
          <h3 className="font-bold text-sm">내 포트폴리오</h3>
          {myWebtoons.map((s) => {
            const row = s as MyWebtoon & { genre?: WebtoonGenre | null };
            return (
              <div key={s.id} className="rounded-xl border border-border/60 p-3 space-y-2">
                <Link href={`/webtoon/series/${s.id}`} className="font-medium text-sm hover:text-[#0096fa]">
                  {s.title}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <select
                    defaultValue={row.genre ?? "FANTASY"}
                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs min-w-[120px]"
                    onChange={(e) => void onChangeGenre(s.id, e.target.value as WebtoonGenre)}
                    disabled={loading}
                  >
                    {WEBTOON_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {WEBTOON_GENRE_LABEL[g]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {err && <p className="text-sm text-destructive">{err}</p>}
      {msg && <p className="text-sm text-[#0096fa]">{msg}</p>}
    </div>
  );
}
