"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StudioAsset, StudioAssetCategory } from "@prisma/client";
import { updateStudioAsset } from "@/studio/actions/assets";
import { STUDIO_CATEGORIES, STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AssetMetadataForm({ asset }: { asset: StudioAsset }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<StudioAssetCategory>(asset.category);
  const [isFree, setIsFree] = useState(asset.isFree);

  return (
    <form
      className="space-y-3 rounded-xl border border-pink-100 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updateStudioAsset(asset.id, {
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
          if (r.error) setError(r.error);
          else router.refresh();
        });
      }}
    >
      <h3 className="font-medium">자산 정보</h3>
      <Input name="name" defaultValue={asset.name} required />
      <Textarea name="description" rows={2} defaultValue={asset.description ?? ""} />
      <select
        className="w-full rounded-md border px-3 py-2 text-sm"
        value={category}
        onChange={(e) => setCategory(e.target.value as StudioAssetCategory)}
      >
        {STUDIO_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {STUDIO_CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <Input name="tags" defaultValue={asset.tags.join(", ")} placeholder="태그 (쉼표)" />
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={isFree} onChange={() => setIsFree(true)} /> 무료
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={!isFree} onChange={() => setIsFree(false)} /> 유료
        </label>
      </div>
      {!isFree && <Input name="priceKrw" type="number" min={100} defaultValue={asset.priceKrw} />}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        정보 저장
      </Button>
    </form>
  );
}
