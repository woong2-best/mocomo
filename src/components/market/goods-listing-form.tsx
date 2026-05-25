"use client";

import { useState } from "react";
import { createGoodsListingRequest } from "@/actions/goods-shop";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
import { uploadImageBlob } from "@/lib/client-upload";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2 } from "lucide-react";

export function GoodsListingForm({ paymentsEnabled }: { paymentsEnabled: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        const url = await uploadImageBlob(file as Blob, file.name);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await createGoodsListingRequest({
      title,
      description,
      images,
      videoUrl: videoUrl || undefined,
    });
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("requestId" in res && res.requestId) setRequestId(res.requestId);
  }

  if (requestId) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 space-y-4">
        <p className="font-semibold">등록 정보가 저장되었습니다.</p>
        <p className="text-sm text-muted-foreground">
          상품 노출을 위해 등록비 <strong>{LISTING_FEE_KRW.toLocaleString()}원</strong>을 결제해 주세요.
        </p>
        {paymentsEnabled ? (
          <PayButton
            type="LISTING_FEE"
            amount={LISTING_FEE_KRW}
            orderName="굿즈샵 등록비"
            metadata={{ requestId }}
            className="w-full rounded-2xl"
          >
            등록비 {LISTING_FEE_KRW.toLocaleString()}원 결제
          </PayButton>
        ) : (
          <p className="text-sm text-destructive">결제 설정이 필요합니다.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submitDraft} className="space-y-4 rounded-2xl border border-border/60 p-5 bg-card">
      <Input
        placeholder="상품명"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl"
        required
      />
      <textarea
        placeholder="상품 설명 (소재, 사이즈, 주의사항 등)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3 text-sm"
        required
      />
      <Input
        placeholder="소개 영상 URL (선택)"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="rounded-xl"
        type="url"
      />

      <div>
            <label className="text-sm font-medium">상품 사진 (선택 · 나중에 추가 가능)</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ))}
          <label className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onImages} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full rounded-2xl" disabled={uploading}>
        다음: 등록비 결제
      </Button>
      <p className="text-xs text-center text-muted-foreground">굿즈 등록 광고비 {LISTING_FEE_KRW.toLocaleString()}원</p>
    </form>
  );
}
