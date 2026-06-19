"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StudioAssetCategory } from "@prisma/client";
import { createStudioAsset } from "@/studio/actions/assets";
import { STUDIO_CATEGORIES, STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AssetCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<StudioAssetCategory>("FURNITURE");
  const [isFree, setIsFree] = useState(true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createStudioAsset({
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? ""),
        category,
        tags: String(fd.get("tags") ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isFree,
        priceKrw: Number(fd.get("priceKrw") ?? 0),
      });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("assetId" in result && result.assetId) {
        router.push(`/studio/assets/${result.assetId}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-pink-700">새 자산 만들기</h1>
      <p className="text-sm text-muted-foreground">Bondee 스타일 · 파스텔 · 저폴리곤 · .glb/.gltf</p>

      <div>
        <label className="mb-1 block text-sm font-medium">이름</label>
        <Input name="name" required placeholder="파스텔 소파" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">설명</label>
        <Textarea name="description" rows={3} placeholder="아늑한 거실용 소파" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">카테고리</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value as StudioAssetCategory)}
        >
          {STUDIO_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {STUDIO_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">태그 (쉼표 구분)</label>
        <Input name="tags" placeholder="sofa, pastel, cozy" />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={isFree} onChange={() => setIsFree(true)} />
          무료
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={!isFree} onChange={() => setIsFree(false)} />
          유료
        </label>
      </div>

      {!isFree && (
        <div>
          <label className="mb-1 block text-sm font-medium">가격 (원)</label>
          <Input name="priceKrw" type="number" min={100} step={100} defaultValue={1000} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "생성 중…" : "다음: 3D 업로드"}
      </Button>
    </form>
  );
}
