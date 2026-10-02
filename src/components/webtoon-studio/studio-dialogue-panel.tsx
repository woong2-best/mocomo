"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import type { WebtoonStudioState } from "@/hooks/use-webtoon-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StudioDialoguePanel({ studio }: { studio: WebtoonStudioState }) {
  const pageDialogues = (studio.project.dialogues ?? []).filter((d) => d.pageId === studio.page.id);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          onClick={() => studio.addDialogue(t("lib.avatar-2d.sv5xgz"), t("webtoon-studio.s4g2lyc"))}
        >
          + 대사
        </Button>
      </div>
      {pageDialogues.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">{t("webtoon-studio.shmrl7j")}</p>
      ) : (
        pageDialogues.map((d) => (
          <div key={d.id} className="rounded-lg border border-border/50 p-2 space-y-1">
            <Input
              value={d.speaker}
              onChange={(e) => studio.updateDialogue(d.id, { speaker: e.target.value })}
              className="h-6 text-[10px]"
              placeholder={t("webtoon-studio.s11juk")}
            />
            <Input
              value={d.text}
              onChange={(e) => studio.updateDialogue(d.id, { text: e.target.value })}
              className="h-6 text-[10px]"
              placeholder={t("webtoon-studio.svi5o")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-destructive"
              onClick={() => studio.removeDialogue(d.id)}
            >
              삭제
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
