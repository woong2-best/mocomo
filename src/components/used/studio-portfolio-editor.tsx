"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { uploadImageBlob } from "@/lib/client-upload";
import {
  MAX_STUDIO_BLOCKS,
  parseVideoEmbed,
  type StudioPortfolioBlock,
} from "@/lib/studio-portfolio";

function rid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const inputClass =
  "w-full rounded-xl border border-border bg-background p-3.5 text-[15px] outline-none focus:border-folk-terracotta";

export function StudioPortfolioEditor({
  coverUrl,
  blocks,
  busy,
  onCover,
  onBlocks,
  onBusy,
  onError,
}: {
  coverUrl: string;
  blocks: StudioPortfolioBlock[];
  busy: boolean;
  onCover: (url: string) => void;
  onBlocks: (blocks: StudioPortfolioBlock[]) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();

  async function pickImage(onUrl: (url: string) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      onBusy(true);
      try {
        onUrl(await uploadImageBlob(file, file.name));
      } catch (err) {
        onError(err instanceof Error ? err.message : t("validation.invalidInput"));
      } finally {
        onBusy(false);
      }
    };
    input.click();
  }

  function patch(id: string, next: StudioPortfolioBlock) {
    onBlocks(blocks.map((block) => (block.id === id ? next : block)));
  }

  function move(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    onBlocks(next);
  }

  function add(type: StudioPortfolioBlock["type"]) {
    if (blocks.length >= MAX_STUDIO_BLOCKS) return;
    if (type === "text") onBlocks([...blocks, { id: rid("text"), type: "text", text: "" }]);
    if (type === "embed") {
      onBlocks([...blocks, { id: rid("embed"), type: "embed", url: "", provider: "youtube", videoId: "" }]);
    }
    if (type === "image") {
      void pickImage((url) => onBlocks([...blocks, { id: rid("img"), type: "image", url }]));
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="text-[15px] font-bold">{t("market.studio.cover")}</p>
        <p className="text-xs text-muted-foreground">{t("market.studio.coverHint")}</p>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        ) : (
          <div className="aspect-[4/3] rounded-2xl border border-dashed border-border bg-muted/40" />
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void pickImage(onCover)}
          className="text-sm font-extrabold text-folk-terracotta"
        >
          {t("market.studio.coverPick")}
        </button>
      </section>

      <section className="space-y-3">
        <p className="text-[15px] font-bold">{t("market.studio.blocks")}</p>
        <p className="text-xs text-muted-foreground">{t("market.studio.embedHint")}</p>
        {blocks.map((block, index) => (
          <div key={block.id} className="space-y-2 rounded-2xl border border-border p-3">
            <div className="flex justify-end gap-2 text-xs font-extrabold text-folk-terracotta">
              <button type="button" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)}>
                ↓
              </button>
              <button type="button" onClick={() => onBlocks(blocks.filter((item) => item.id !== block.id))}>
                ✕
              </button>
            </div>
            {block.type === "text" ? (
              <textarea
                value={block.text}
                onChange={(e) => patch(block.id, { ...block, text: e.target.value })}
                placeholder={t("market.studio.blockTextPh")}
                className={`${inputClass} min-h-[120px]`}
              />
            ) : null}
            {block.type === "image" ? (
              <img src={block.url} alt="" className="w-full rounded-xl object-cover" />
            ) : null}
            {block.type === "embed" ? (
              <div className="space-y-2">
                <input
                  value={block.url}
                  onChange={(e) => {
                    const embed = parseVideoEmbed(e.target.value);
                    patch(
                      block.id,
                      embed
                        ? { id: block.id, type: "embed", url: embed.url, provider: embed.provider, videoId: embed.videoId }
                        : { ...block, url: e.target.value, videoId: "" }
                    );
                  }}
                  placeholder={t("market.studio.embedPh")}
                  className={inputClass}
                />
                {parseVideoEmbed(block.url) ? (
                  <iframe
                    src={parseVideoEmbed(block.url)?.embedSrc}
                    title="Embed preview"
                    className="aspect-video w-full rounded-xl bg-black"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-full border border-border px-3 py-1.5 text-sm font-extrabold" onClick={() => add("text")}>
            {t("market.studio.addText")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-extrabold"
            onClick={() => add("image")}
          >
            {t("market.studio.addImage")}
          </button>
          <button type="button" className="rounded-full border border-border px-3 py-1.5 text-sm font-extrabold" onClick={() => add("embed")}>
            {t("market.studio.addEmbed")}
          </button>
        </div>
      </section>
    </div>
  );
}
