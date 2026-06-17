"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCosplayBoardPost } from "@/actions/cosplay-board";
import { UsedImageComposer } from "@/components/media/post-media-composer";
import { UsedRegionSelect } from "@/components/used/used-region-select";
import { formatUsedRegion, getSigunguList, KOREA_SIDO, parseUsedRegion } from "@/lib/korea-regions";
import type { CosplayBoardMode } from "@/lib/cosplay-board-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MODES: { id: CosplayBoardMode; label: string }[] = [
  { id: "rental", label: "코스프레 대여" },
  { id: "purchase", label: "구매" },
];

export function CosplayBoardPostForm({ defaultMode }: { defaultMode: CosplayBoardMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<CosplayBoardMode>(defaultMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [price, setPrice] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [workTitle, setWorkTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const initialRegion = formatUsedRegion(KOREA_SIDO[0].short, getSigunguList(KOREA_SIDO[0].id)[0] ?? "종로구");
  const [region, setRegion] = useState(initialRegion);
  const [images, setImages] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mediaUploading) {
      setError("사진 업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
      return;
    }

    const parsedRegion = parseUsedRegion(region) ? region : undefined;
    const numericPrice = price.trim() ? Math.floor(Number(price)) : undefined;

    const res = await createCosplayBoardPost({
      mode,
      title,
      content,
      price: numericPrice,
      priceLabel: priceLabel.trim() || undefined,
      region: parsedRegion,
      workTitle: workTitle.trim() || undefined,
      character: character.trim() || undefined,
      sizeLabel: sizeLabel.trim() || undefined,
      images,
    });

    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("postId" in res && res.postId) {
      router.push(`/cosplay/board/${res.postId}`);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border-2 border-[#3b4890]/30 bg-[#eef1fb] dark:bg-muted/40 p-1">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn(
                "min-w-[7.5rem] px-4 py-2 rounded-full text-sm font-bold transition-all",
                mode === item.id
                  ? "bg-[#3b4890] text-white shadow-md"
                  : "text-[#3b4890] dark:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">제목</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "rental" ? "예: [대여] 원신 나히다 풀셋" : "예: [판매] 체인소맨 파워 풀셋"}
          maxLength={200}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">작품명</label>
          <Input
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            placeholder="예: 원신, 블루 아카이브"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">캐릭터</label>
          <Input
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            placeholder="예: 나히다, 아리사"
            maxLength={80}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {mode === "rental" ? "1일 대여료 (원)" : "판매가 (원)"}
          </label>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="비우면 협의"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">가격 표시 (선택)</label>
          <Input
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            placeholder="예: 1일 25,000원, 협의"
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">사이즈</label>
          <Input
            value={sizeLabel}
            onChange={(e) => setSizeLabel(e.target.value)}
            placeholder="예: M, Free"
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">거래 지역</label>
        <UsedRegionSelect value={region} onChange={setRegion} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">상세 내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          required
          minLength={10}
          placeholder={
            mode === "rental"
              ? "대여 조건, 보증금, 픽업/반납 방법, 포함 품목 등을 적어 주세요."
              : "상품 상태, 포함 품목, 거래 방법 등을 적어 주세요."
          }
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-y min-h-[10rem]"
        />
      </div>

      <UsedImageComposer
        images={images}
        onChange={setImages}
        max={8}
        onUploadingChange={setMediaUploading}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || mediaUploading} className="rounded-xl">
          {loading ? "등록 중…" : "등록하기"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" asChild>
          <Link href={mode === "purchase" ? "/cosplay?mode=purchase" : "/cosplay"}>취소</Link>
        </Button>
      </div>
    </form>
  );
}
