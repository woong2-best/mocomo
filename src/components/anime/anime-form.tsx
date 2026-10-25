"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAnime, updateAnime } from "@/actions/anime";
import { AnimeImageUrlField } from "@/components/anime/anime-image-url-field";
import { CultureWikiEditNotice } from "@/components/anime/culture-wiki-edit-notice";
import { WikiContent } from "@/components/anime/wiki-content";
import { WikiLinkStatusProvider } from "@/components/anime/wiki-link-context";
import { WikiEditor } from "@/components/wiki/WikiEditor";
import { ANIME_GENRES } from "@/lib/anime-genres";
import {
  DEFAULT_WIKI_DOCUMENT,
  charactersToText,
  composeWikiDocument,
  extractWikiLinkTargets,
  splitWikiDocument,
} from "@/lib/wiki/document";
import type { WikiLinkStatusMap } from "@/lib/wiki/resolve-links";
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

function usePreviewWikiLinks(document: string): WikiLinkStatusMap {
  const targets = useMemo(() => extractWikiLinkTargets(document), [document]);
  const key = targets.join("\u0001");
  const [status, setStatus] = useState<WikiLinkStatusMap>({});

  useEffect(() => {
    if (!targets.length) {
      setStatus({});
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/anime/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles: targets }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { links: {} }))
        .then((data: { links?: WikiLinkStatusMap }) => {
          setStatus(data.links ?? {});
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus({});
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // targets is derived from document; key is the stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return status;
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
  const [document, setDocument] = useState(() => {
    if (mode === "create") return DEFAULT_WIKI_DOCUMENT;
    return composeWikiDocument({
      synopsis: initial?.synopsis,
      worldInfo: initial?.worldInfo,
      infobox: initial?.infobox,
      charactersText: charactersToText(initial?.characters),
    });
  });
  const previewLinks = usePreviewWikiLinks(document);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const split = splitWikiDocument(document);
    const payload = {
      title: form.get("title") as string,
      titleEn: (form.get("titleEn") as string) || undefined,
      genre,
      synopsis: split.body.trim() || undefined,
      studio: split.studio || undefined,
      worldInfo: undefined,
      infobox: split.infobox,
      coverUrl: (form.get("coverUrl") as string) || undefined,
      bannerUrl: (form.get("bannerUrl") as string) || undefined,
      charactersText: split.charactersText,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>{mode === "create" ? t("anime.sntmi00") : t("anime.slz47qx")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("wiki.form.metaHelp")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>{t("wiki.editor.bodyLabel")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("wiki.editor.bodyHelp")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <WikiEditor
            variant="body"
            value={document}
            onChange={setDocument}
            placeholder={t("wiki.editor.placeholder")}
          />
          {document.trim() ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 min-h-[120px] overflow-y-auto">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">
                {t("wiki.editor.preview")}
              </p>
              <WikiLinkStatusProvider value={previewLinks}>
                <WikiContent source={document} />
              </WikiLinkStatusProvider>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <CultureWikiEditNotice />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("auth.saving") : mode === "create" ? t("anime.snlmhd0") : t("anime.s2tq8bs")}
      </Button>
    </form>
  );
}
