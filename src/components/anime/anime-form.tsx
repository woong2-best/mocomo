"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnime, updateAnime } from "@/actions/anime";
import { AnimeInfoboxField } from "@/components/anime/anime-infobox-field";
import { AnimeWikiField } from "@/components/anime/anime-wiki-field";
import { AnimeImageUrlField } from "@/components/anime/anime-image-url-field";
import { CultureWikiEditNotice } from "@/components/anime/culture-wiki-edit-notice";
import { WikiContent } from "@/components/anime/wiki-content";
import { WikiEditor } from "@/components/wiki/WikiEditor";
import { ANIME_GENRES } from "@/lib/anime-genres";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimeGenre } from "@prisma/client";
import { createTranslator } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const t = createTranslator("en");

type AnimeFormData = {
  title: string;
  titleEn?: string | null;
  genre: AnimeGenre;
  synopsis?: string | null;
  studio?: string | null;
  worldInfo?: string | null;
  infobox?: string | null;
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
  const [genre, setGenre] = useState<AnimeGenre>(initial?.genre ?? "OTHER");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title") as string,
      titleEn: (form.get("titleEn") as string) || undefined,
      genre,
      synopsis: synopsis.trim() || undefined,
      studio: (form.get("studio") as string) || undefined,
      worldInfo: (form.get("worldInfo") as string) || undefined,
      infobox: (form.get("infobox") as string) || undefined,
      coverUrl: (form.get("coverUrl") as string) || undefined,
      bannerUrl: (form.get("bannerUrl") as string) || undefined,
      charactersText: (form.get("charactersText") as string) || undefined,
      tags: (form.get("tags") as string) || undefined,
      editSummary: (form.get("editSummary") as string) || undefined,
    };

    const result =
      mode === "create" ? await createAnime(payload) : await updateAnime(slug!, payload);

    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error.includes(".") ? t(result.error) : result.error);
      return;
    }
    if ("anime" in result && result.anime) router.push(`/anime/${result.anime.slug}`);
  }

  return (
    <Card className="rounded-2xl shadow-md max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? t("anime.sntmi00") : t("anime.slz47qx")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("anime.s1kbp9gt")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("anime.spzylzr")}</label>
            <Input name="title" defaultValue={initial?.title} required className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">{t("anime.sghpkl2")}</label>
            <Input name="titleEn" defaultValue={initial?.titleEn ?? ""} className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium">{t("anime.spxo9fd")}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ANIME_GENRES.map((g) => {
                const active = genre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenre(g.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {g.emoji} {g.label}
                  </button>
                );
              })}
            </div>
          </div>
          <AnimeImageUrlField
            name="coverUrl"
            label={t("anime.sz3ckjk")}
            defaultValue={initial?.coverUrl ?? ""}
            previewAspect="square"
            uploadLabel={t("anime.sce7mwp")}
          />
          <AnimeImageUrlField
            name="bannerUrl"
            label={t("profile.s1qwzit0")}
            defaultValue={initial?.bannerUrl ?? ""}
            previewAspect="banner"
            uploadLabel={t("anime.szn2ekl")}
          />
          <div>
            <label className="text-sm font-medium">{t("anime.sua6af")}</label>
            <Input name="studio" defaultValue={initial?.studio ?? ""} className="mt-1 rounded-xl" />
          </div>
          <AnimeInfoboxField
            name="infobox"
            label={t("anime.si9t5x0")}
            defaultValue={initial?.infobox ?? ""}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("anime.s6qhlci")}</label>
            <WikiEditor
              variant="body"
              value={synopsis}
              onChange={setSynopsis}
              placeholder={t("anime.sucjpw8")}
            />
            {synopsis.trim() ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 min-h-[120px] overflow-y-auto">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">
                  {t("anime.s1xa6ah0")}
                </p>
                <WikiContent source={synopsis} />
              </div>
            ) : null}
          </div>
          <AnimeWikiField
            name="worldInfo"
            label={t("anime.st569g")}
            defaultValue={initial?.worldInfo ?? ""}
            rows={5}
          />
          <div>
            <label className="text-sm font-medium">{t("anime.s16cdth4")}</label>
            <textarea
              name="charactersText"
              defaultValue={charactersToText(initial?.characters)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("anime.sm1dzed")}</label>
            <Input name="tags" defaultValue={initial?.tags?.join(", ") ?? ""} className="mt-1 rounded-xl" />
          </div>
          {mode === "edit" && (
            <div>
              <label className="text-sm font-medium">{t("anime.s1nlgc9k")}</label>
              <Input
                name="editSummary"
                placeholder={t("anime.s16947su")}
                className="mt-1 rounded-xl"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <CultureWikiEditNotice />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.saving") : mode === "create" ? t("anime.snlmhd0") : t("anime.s2tq8bs")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
