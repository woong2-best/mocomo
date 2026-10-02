"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createCommunity } from "@/actions/community-hub";
import {
  COMMUNITY_CATEGORY_OPTIONS,
  QNA_NSFW_CATEGORY_ID,
  qnaCreateSelectionToApi,
  type QnaCreateCategorySelection,
} from "@/lib/community-labels";
import { uploadImageBlob } from "@/lib/client-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ImagePlus, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQnaNsfwGate } from "@/hooks/use-qna-nsfw-gate";
import { QnaNsfwBlockedDialog } from "@/components/communities/qna-nsfw-blocked-dialog";

const CREATE_CATEGORY_OPTIONS = COMMUNITY_CATEGORY_OPTIONS.filter((o) => o.id !== "INFO");

type DetailBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "image"; previewUrl: string; file: File };

function newBlockId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function serializeDetailContent(
  blocks: DetailBlock[],
  trailingDraft: string
): Promise<string | undefined> {
  const sequence: DetailBlock[] = [...blocks];
  if (trailingDraft.trim()) {
    sequence.push({ id: "trail", kind: "text", text: trailingDraft });
  }
  if (sequence.length === 0) return undefined;

  const parts: string[] = [];
  for (const block of sequence) {
    if (block.kind === "text") {
      const t = block.text.trim();
      if (t) parts.push(t);
      continue;
    }
    const url = await uploadImageBlob(block.file, block.file.name || `qna-detail-${Date.now()}.jpg`);
    parts.push(url);
  }
  const joined = parts.join("\n\n").trim();
  return joined || undefined;
}

export function CommunityCreateForm({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<QnaCreateCategorySelection | "">("");
  const [name, setName] = useState("");
  const [detailBlocks, setDetailBlocks] = useState<DetailBlock[]>([]);
  const [detailDraft, setDetailDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { blockedOpen, setBlockedOpen, guardCategoryNav } = useQnaNsfwGate();

  const pickCategory = useCallback(
    (next: QnaCreateCategorySelection) => {
      void (async () => {
        const ok = await guardCategoryNav(next);
        if (!ok) return;
        setCategory(next);
      })();
    },
    [guardCategoryNav]
  );

  const pickDetailImage = useCallback(
    (file: File | null) => {
      if (!file || loading) return;
      const previewUrl = URL.createObjectURL(file);
      setDetailBlocks((prev) => {
        const next = [...prev];
        if (detailDraft.length > 0) {
          next.push({ id: newBlockId(), kind: "text", text: detailDraft });
        }
        next.push({ id: newBlockId(), kind: "image", previewUrl, file });
        return next;
      });
      setDetailDraft("");
    },
    [detailDraft, loading]
  );

  const removeDetailImage = useCallback(
    (blockId: string) => {
      if (loading) return;
      setDetailBlocks((prev) => {
        const target = prev.find((b) => b.id === blockId);
        if (target?.kind === "image") URL.revokeObjectURL(target.previewUrl);
        return prev.filter((b) => b.id !== blockId);
      });
    },
    [loading]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!category) {
      setError(t("communities.qna_2"));
      return;
    }
    if (name.trim().length < 2) {
      setError(t("communities.s1f9tfcz"));
      return;
    }

    setLoading(true);

    try {
      const description = await serializeDetailContent(detailBlocks, detailDraft);
      const payload = qnaCreateSelectionToApi(category);
      const result = await createCommunity({
        name: name.trim(),
        description,
        category: payload.category,
        customCategoryLabel: payload.customCategoryLabel,
        isNsfw: payload.isNsfw,
      });

      if (!result) {
        setError(t("communities.s1l6s9v1"));
        return;
      }
      if ("error" in result && result.error) {
        setError(errorText(result.error));
        return;
      }
      if ("community" in result && result.community?.slug) {
        window.location.assign("/communities");
        return;
      }

      setError(t("communities.qna_qna"));
    } catch (err) {
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("communities.spxpheq");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={embedded ? undefined : "max-w-lg mx-auto p-4 pb-8"}>
      <Link
        href="/communities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        QnA
      </Link>

      <Card className="rounded-md border-[#d5d5d5] shadow-sm">
        <CardHeader className="border-b border-[#e8e8e8] bg-[#f7f7f7] dark:bg-muted/30 dark:border-border">
          <CardTitle className="text-lg">{t("communities.qna")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-sm font-semibold">
                  {t("games.categories")} <span className="text-[#c80000]">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">{t("communities.s1mmalns")}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {CREATE_CATEGORY_OPTIONS.map((opt) => {
                  const selected = category === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={loading}
                      onClick={() => pickCategory(opt.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-sm border px-2 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-[#c80000] bg-[#c80000]/5 text-foreground ring-1 ring-[#c80000]/40"
                          : "border-border bg-background hover:border-foreground/30 hover:bg-muted/40",
                        loading && "opacity-60"
                      )}
                    >
                      <span className="text-base leading-none">{opt.emoji}</span>
                      <span className="font-medium leading-snug text-xs">{opt.shortLabel}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => pickCategory(QNA_NSFW_CATEGORY_ID)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-sm border px-2 py-2.5 text-left text-sm transition-colors",
                    category === QNA_NSFW_CATEGORY_ID
                      ? "border-[#c80000] bg-[#c80000]/5 text-foreground ring-1 ring-[#c80000]/40"
                      : "border-[#c80000]/35 bg-background hover:border-[#c80000]/55 hover:bg-muted/40",
                    loading && "opacity-60"
                  )}
                >
                  <span className="text-base leading-none">🔞</span>
                  <span className="font-medium leading-snug text-xs">NSFW</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="community-name" className="text-sm font-semibold">
                Q <span className="text-[#c80000]">*</span>
              </label>
              <Input
                id="community-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should I ask?"
                required
                minLength={2}
                maxLength={80}
                disabled={loading}
                className="rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="community-detail" className="text-sm font-semibold">
                  detail
                </label>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#1e3a8a] hover:underline disabled:opacity-60"
                >
                  <ImagePlus className="h-4 w-4" />
                  {t("communities.szumw")}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    pickDetailImage(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="min-h-[180px] rounded-sm border border-border bg-background/50 p-3 space-y-2.5">
                {detailBlocks.map((block) =>
                  block.kind === "text" ? (
                    <p key={block.id} className="text-sm whitespace-pre-wrap">
                      {block.text}
                    </p>
                  ) : (
                    <div key={block.id} className="relative w-full">
                      <Image
                        src={block.previewUrl}
                        alt=""
                        width={800}
                        height={320}
                        unoptimized
                        className="w-full h-40 object-cover rounded-sm bg-muted"
                      />
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => removeDetailImage(block.id)}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white shadow flex items-center justify-center text-[#c80000] disabled:opacity-60"
                        aria-label={t("communities.seyfvin")}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  )
                )}
                <textarea
                  id="community-detail"
                  value={detailDraft}
                  onChange={(e) => setDetailDraft(e.target.value)}
                  placeholder="Type your question"
                  maxLength={500}
                  disabled={loading}
                  className="w-full min-h-[120px] text-sm outline-none resize-y bg-transparent disabled:opacity-60"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Q&A answers are not professional advice. You post at your own risk. By creating a QnA,
              you agree to MoCoMo{" "}
              <Link href="/legal/community-qna-terms" className="font-semibold underline underline-offset-2">
                Q&A Terms (Section 13)
              </Link>{" "}
              and the{" "}
              <Link href="/legal/terms" className="font-semibold underline underline-offset-2">
                Terms of Service
              </Link>
              .
            </p>

            <Button
              type="submit"
              className="w-full rounded-sm bg-[#c80000] hover:bg-[#c80000]/90"
              disabled={loading || !category}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("communities.s1w6bzz5")}
                </>
              ) : (
                t("communities.qna_3")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <QnaNsfwBlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </div>
  );
}
