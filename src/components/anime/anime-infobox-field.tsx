"use client";

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
          {preview ? "미리보기 끄기" : "미리보기"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug whitespace-pre-wrap">{WIKI_INFOBOX_HELP}</p>
      <div className={preview ? "grid gap-3 xl:grid-cols-2" : ""}>
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={14}
          placeholder={`=== 작품 정보 ===\n장르 | 액션, 판타지\n감독 | ...`}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm font-mono leading-relaxed resize-y min-h-[220px]"
        />
        {preview && (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 min-h-[220px] overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">작품 정보표 미리보기</p>
            {value.trim() ? (
              <AnimeWikiInfobox source={value} />
            ) : (
              <p className="text-xs text-muted-foreground">위 형식으로 입력하면 나무위키 스타일 표가 표시됩니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
