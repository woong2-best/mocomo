"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
      setErr(e instanceof Error ? e.message : t("webtoon.s1jd5iav"));
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
      setErr(e instanceof Error ? e.message : t("works.s1bw7noj"));
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
      setErr(errorText(res.error));
      return;
    }
    setSeriesId(res.series!.id);
    setMsg(`포트폴리오 「${res.series!.title}」가 만들어졌습니다.`);
  }

  async function onPublishEpisode() {
    if (!seriesId) {
      setErr(t("webtoon.s1pmjgtz"));
      return;
    }
    setLoading(true);
    setErr("");
    setMsg("");
    const res = await publishCreatorEpisode({
      seriesId,
      title: episodeTitle.trim() || `Work ${episodeNo}`,
      episodeNo,
      price,
      contentUrls,
      previewUrls: contentUrls.slice(0, Math.max(1, freePreviewCount || 1)),
      freePreviewCount,
      scheduledAt: scheduledAt.trim() || null,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(errorText(res.error));
      return;
    }
    setMsg(t("webtoon.sz27lds"));
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
      setErr(errorText(res.error));
      return;
    }
    setMsg(t("webtoon.s1fh89co"));
  }

  return (
    <div className="space-y-8">
      <section className="folk-card p-5 space-y-4">
        <h2 className="font-bold text-folk-cobalt">{t("webtoon.sbm6ded")}</h2>
        <p className="text-xs text-muted-foreground">
          작품을 묶을 폴더입니다. 예: 「2026 일러스트」「OC 모음」
        </p>
        <Input placeholder={t("webtoon.szafki8")} value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        <Textarea
          placeholder={t("seller.bio")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl min-h-[80px]"
        />
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{t("webtoon.ss8j1q4")}</p>
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
        <h2 className="font-bold text-folk-cobalt">{t("webtoon.s1dq8uao")}</h2>
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
          placeholder={t("works.spskwxi")}
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
              placeholder={t("webtoon-studio.s1j1ifjs")}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{t("webtoon.sd7kwuz")}</p>
          </div>
          <div>
            <Input
              type="number"
              min={0}
              value={freePreviewCount}
              onChange={(e) => setFreePreviewCount(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{t("webtoon.s1sejc6w")}</p>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t("webtoon.szslk36")}</span>
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("webtoon.sr3qmp9")}
        </Button>
      </section>

      {myWebtoons.length > 0 && (
        <section className="folk-card p-5 space-y-3">
          <h3 className="font-bold text-sm">{t("webtoon.s1gvl778")}</h3>
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
