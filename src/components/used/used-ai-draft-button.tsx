"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UsedListingAiDraft } from "@/lib/used-listing-ai";
import { cn } from "@/lib/utils";

type UsedAiDraftButtonProps = {
  images: string[];
  category: string;
  productType: string;
  workTitle: string;
  region: string;
  saleType: "FIXED" | "AUCTION";
  isFree: boolean;
  partialTitle: string;
  partialDescription: string;
  disabled?: boolean;
  onApply: (draft: UsedListingAiDraft) => void;
};

export function UsedAiDraftButton({
  images,
  category,
  productType,
  workTitle,
  region,
  saleType,
  isFree,
  partialTitle,
  partialDescription,
  disabled,
  onApply,
}: UsedAiDraftButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const readyImages = images.filter((u) => u.startsWith("https://"));
  const canRun = readyImages.length > 0 && !disabled && !loading;

  async function runAi() {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/used/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          images: readyImages,
          category,
          productType,
          workTitle,
          region,
          saleType,
          isFree,
          partialTitle,
          partialDescription,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        draft?: UsedListingAiDraft;
        error?: string;
      };

      if (!res.ok || !data.draft) {
        setError(data.error || "AI 글 생성에 실패했습니다.");
        return;
      }

      onApply(data.draft);
      setMessage("사진을 보고 설명을 작성했습니다. 내용을 확인한 뒤 등록해 주세요.");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            AI 상품 설명
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            올린 사진을 보고 상품 설명(제목·가격 초안 포함)을 대신 써 드립니다. 확인 후
            수정해서 올려 주세요.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={cn(
            "shrink-0 rounded-full gap-1.5",
            "bg-violet-600 text-white hover:bg-violet-700"
          )}
          disabled={!canRun}
          onClick={() => void runAi()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "분석 중…" : "AI로 설명 쓰기"}
        </Button>
      </div>

      {readyImages.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          사진을 1장 이상 업로드하면 AI 작성을 사용할 수 있습니다.
        </p>
      )}
      {message && <p className="text-xs text-violet-700 dark:text-violet-300">{message}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
