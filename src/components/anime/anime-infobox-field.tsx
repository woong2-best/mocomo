"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AnimeWikiInfobox } from "@/components/anime/anime-wiki-infobox";
import { WIKI_INFOBOX_HELP } from "@/lib/anime-wiki-infobox";
import { Button } from "@/components/ui/button";

export function AnimeInfoboxField({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-lg"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? t("anime.s1wwhs7w") : t("support.sohlxtc")}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug whitespace-pre-wrap">{WIKI_INFOBOX_HELP}</p>
      <div className={preview ? "grid gap-3 xl:grid-cols-2" : ""}>
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={14}
          placeholder={t("anime.n_n")}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm font-mono leading-relaxed resize-y min-h-[220px]"
        />
        {preview && (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 min-h-[220px] overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">{t("anime.s1s9lsd8")}</p>
            {value.trim() ? (
              <AnimeWikiInfobox source={value} />
            ) : (
              <p className="text-xs text-muted-foreground">{t("anime.s10255ut")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
