"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnime, updateAnime } from "@/actions/anime";
import { CultureWikiEditNotice } from "@/components/anime/culture-wiki-edit-notice";
import { WikiEditor } from "@/components/wiki/WikiEditor";
import { prepareGalleryImageForUpload } from "@/lib/gallery-image-upload";
import { uploadImageBlob } from "@/lib/client-upload";
import { animeFieldsToMarkdown, markdownToAnimeFields } from "@/lib/wiki/formBridge";
import { Input } from "@/components/ui/input";
import { AnimeGenre } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";

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
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState(() =>
    animeFieldsToMarkdown({
      title: initial?.title,
      titleEn: initial?.titleEn ?? undefined,
      genre: initial?.genre ?? "OTHER",
      synopsis: initial?.synopsis ?? undefined,
      studio: initial?.studio ?? undefined,
      worldInfo: initial?.worldInfo ?? undefined,
      infobox: initial?.infobox ?? undefined,
      coverUrl: initial?.coverUrl ?? undefined,
      bannerUrl: initial?.bannerUrl ?? undefined,
      charactersText: charactersToText(initial?.characters),
      tags: initial?.tags?.join(", "),
    })
  );
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial?.bannerUrl ?? "");
  const [editSummary, setEditSummary] = useState("");

  async function handleWikiSubmit(nextMarkdown: string) {
    // TODO: official wiki markdown persist pipeline (server/API/DB unchanged).
    // Temporary client adapter maps markdown → existing createAnime/updateAnime payload.
    setLoading(true);
    setError("");

    const payload = {
      ...markdownToAnimeFields(nextMarkdown, {
        coverUrl: coverUrl || undefined,
        bannerUrl: bannerUrl || undefined,
      }),
      infobox: initial?.infobox ?? undefined,
      editSummary: mode === "edit" ? editSummary || undefined : undefined,
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
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold text-folk-cobalt">
          {mode === "create" ? t("anime.sntmi00") : t("anime.slz47qx")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("anime.s1kbp9gt")}</p>
      </div>

      <WikiEditor
        value={markdown}
        onChange={setMarkdown}
        onSubmit={handleWikiSubmit}
        showSubmit
        submitDisabled={loading}
        submitLabel={loading ? t("auth.saving") : mode === "create" ? t("cosplay.snlmhd0") : t("anime.s2tq8bs")}
        initialCoverUrl={coverUrl || undefined}
        initialBannerUrl={bannerUrl || undefined}
        onUploadImage={async (file, kind) => {
          const prepared = await prepareGalleryImageForUpload(file);
          const url = await uploadImageBlob(prepared, prepared.name || `${kind}.webp`);
          if (kind === "cover") setCoverUrl(url);
          else setBannerUrl(url);
          return url;
        }}
      />

      {mode === "edit" && (
        <div>
          <label className="text-sm font-medium">{t("anime.s1nlgc9k")}</label>
          <Input
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            placeholder={t("anime.s16947su")}
            className="mt-1 rounded-xl"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <CultureWikiEditNotice />
    </div>
  );
}
