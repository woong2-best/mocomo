"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnime, updateAnime } from "@/actions/anime";
import { ANIME_GENRES } from "@/lib/anime-genres";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimeGenre } from "@prisma/client";

type AnimeFormData = {
  title: string;
  titleEn?: string | null;
  genre: AnimeGenre;
  synopsis?: string | null;
  studio?: string | null;
  worldInfo?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  characters?: unknown;
  tags?: string[];
};

function charactersToText(characters: unknown): string {
  if (!characters || !Array.isArray(characters)) return "";
  return characters
    .map((c) => (typeof c === "object" && c && "name" in c ? String((c as { name: string }).name) : ""))
    .filter(Boolean)
    .join("\n");
}

export function AnimeForm({
  mode,
  slug,
  initial,
}: {
  mode: "create" | "edit";
  slug?: string;
  initial?: Partial<AnimeFormData>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title") as string,
      titleEn: (form.get("titleEn") as string) || undefined,
      genre: form.get("genre") as AnimeGenre,
      synopsis: (form.get("synopsis") as string) || undefined,
      studio: (form.get("studio") as string) || undefined,
      worldInfo: (form.get("worldInfo") as string) || undefined,
      coverUrl: (form.get("coverUrl") as string) || undefined,
      bannerUrl: (form.get("bannerUrl") as string) || undefined,
      charactersText: (form.get("charactersText") as string) || undefined,
      tags: (form.get("tags") as string) || undefined,
    };

    const result =
      mode === "create"
        ? await createAnime(payload)
        : await updateAnime(slug!, payload);

    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (result.anime) router.push(`/anime/${result.anime.slug}`);
  }

  return (
    <Card className="rounded-2xl shadow-md max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "애니 등록" : "애니 수정"}</CardTitle>
        <p className="text-sm text-muted-foreground">직접 설명과 이미지 URL을 추가할 수 있어요.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">제목 *</label>
            <Input name="title" defaultValue={initial?.title} required className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">영문 제목</label>
            <Input name="titleEn" defaultValue={initial?.titleEn ?? ""} className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">장르 *</label>
            <select
              name="genre"
              defaultValue={initial?.genre ?? "OTHER"}
              className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              required
            >
              {ANIME_GENRES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">표지 이미지 URL</label>
            <Input name="coverUrl" type="url" defaultValue={initial?.coverUrl ?? ""} placeholder="https://..." className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">배너 이미지 URL</label>
            <Input name="bannerUrl" type="url" defaultValue={initial?.bannerUrl ?? ""} placeholder="https://..." className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">제작사</label>
            <Input name="studio" defaultValue={initial?.studio ?? ""} className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">줄거리 / 설명</label>
            <textarea
              name="synopsis"
              defaultValue={initial?.synopsis ?? ""}
              rows={5}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
              placeholder="나무위키처럼 자유롭게 설명을 적어주세요"
            />
          </div>
          <div>
            <label className="text-sm font-medium">세계관</label>
            <textarea
              name="worldInfo"
              defaultValue={initial?.worldInfo ?? ""}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">등장인물 (한 줄에 한 명)</label>
            <textarea
              name="charactersText"
              defaultValue={charactersToText(initial?.characters)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">태그 (쉼표 구분)</label>
            <Input name="tags" defaultValue={initial?.tags?.join(", ") ?? ""} className="mt-1 rounded-xl" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "저장 중..." : mode === "create" ? "등록하기" : "수정 저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
