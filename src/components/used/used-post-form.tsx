"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUsedListing } from "@/actions/used-market";
import { uploadImageBlob } from "@/lib/client-upload";
import { USED_CATEGORIES } from "@/lib/used-market";
import { UsedRegionSelect } from "@/components/used/used-region-select";
import { formatUsedRegion, getSigunguList, KOREA_SIDO, parseUsedRegion } from "@/lib/korea-regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2 } from "lucide-react";

export function UsedPostForm({ defaultRegion }: { defaultRegion?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState("GOODS");
  const initialRegion = (() => {
    if (defaultRegion && parseUsedRegion(defaultRegion)) return defaultRegion;
    return formatUsedRegion(KOREA_SIDO[0].short, getSigunguList(KOREA_SIDO[0].id)[0] ?? "종로구");
  })();
  const [region, setRegion] = useState(initialRegion);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10 - images.length)) {
        const url = await uploadImageBlob(file as Blob, file.name);
        setImages((prev) => [...prev, url].slice(0, 10));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createUsedListing({
      title,
      description,
      price: isFree ? 0 : Number(price) || 0,
      category,
      region,
      images,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("listingId" in res && res.listingId) router.push(`/used/${res.listingId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-8">
      <div>
        <label className="text-sm font-medium">사진 (최대 10장)</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ))}
          {images.length < 10 && (
            <label className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer bg-muted/40 hover:bg-muted/60">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              )}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onImages} />
            </label>
          )}
        </div>
      </div>

      <Input
        placeholder="글 제목 (예: 원신 피규어 판매)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl h-11"
        required
      />

      <textarea
        placeholder="자세한 설명, 거래 방식, 하자 여부 등"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full min-h-[120px] rounded-xl border border-border p-3 text-sm"
        required
      />

      <div className="flex gap-2 items-center">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          나눔 (무료)
        </label>
      </div>
      {!isFree && (
        <Input
          type="number"
          placeholder="가격 (원)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-xl"
          min={0}
          required
        />
      )}

      <select
        className="w-full h-11 rounded-xl border border-border px-3 text-sm"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {USED_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <UsedRegionSelect value={region} onChange={setRegion} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" variant="secondary" disabled={loading || uploading} size="lg" className="w-full">
        {loading ? "등록 중…" : "중고거래 글 올리기"}
      </Button>
    </form>
  );
}
