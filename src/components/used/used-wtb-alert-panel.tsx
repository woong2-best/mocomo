"use client";

import { useState } from "react";
import { createSubcultureWtbAlert } from "@/actions/subculture-wtb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usedProductTypeLabel } from "@/lib/used-catalog";

export function UsedWtbAlertPanel({
  workTitle,
  animeSlug,
  productType,
  characterName,
  currency,
  loggedIn,
}: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
  currency?: string;
  loggedIn: boolean;
}) {
  const [maxPrice, setMaxPrice] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!workTitle && !animeSlug && !productType) return null;

  async function submit() {
    setLoading(true);
    setError("");
    const res = await createSubcultureWtbAlert({
      workTitle,
      animeSlug,
      productType,
      characterName,
      maxPrice: maxPrice.trim() ? Math.floor(Number(maxPrice) || 0) : null,
      currency: currency ?? "krw",
      note: note.trim() || null,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-primary font-medium rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
        WTB 알림이 등록됐어요. 조건에 맞는 상품이 올라오면 알려 드릴게요.
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-dashed border-border p-4 space-y-3">
      <div>
        <h2 className="text-sm font-bold">WTB 알림 받기</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {[workTitle, productType ? usedProductTypeLabel(productType) : null, characterName]
            .filter(Boolean)
            .join(" · ")}{" "}
          조건의 새 글이 올라오면 알림을 보내 드려요.
        </p>
      </div>
      {!loggedIn ? (
        <p className="text-xs text-muted-foreground">
          <a href="/auth/signin" className="text-primary underline">
            로그인
          </a>
          후 WTB 알림을 등록할 수 있어요.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={0}
              placeholder="희망 최대가 (선택)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-xl h-10"
            />
            <Input
              placeholder="메모 (선택)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl h-10"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="button" size="sm" disabled={loading} onClick={() => void submit()}>
            {loading ? "등록 중…" : "WTB 알림 등록"}
          </Button>
        </>
      )}
    </section>
  );
}
