"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAnimeGoods, deleteAnimeGoods } from "@/actions/anime";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

type GoodsRow = {
  id: string;
  title: string;
  type: string;
  price: number | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

export function AnimeGoodsPanel({
  animeId,
  slug,
  goods,
  canEdit,
}: {
  animeId: string;
  slug: string;
  goods: GoodsRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const priceRaw = (form.get("price") as string)?.trim();
    const result = await addAnimeGoods({
      animeId,
      title: form.get("title") as string,
      type: form.get("type") as string,
      price: priceRaw ? Number(priceRaw) : undefined,
      imageUrl: (form.get("imageUrl") as string) || undefined,
      linkUrl: (form.get("linkUrl") as string) || undefined,
    });
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteAnimeGoods(id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">위키 굿즈 정보</p>
        <Link
          href={`/used?anime=${encodeURIComponent(slug)}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          중고거래에서 찾기 →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {goods.length === 0 ? (
          <p className="text-muted-foreground col-span-full">굿즈 정보 없음</p>
        ) : (
          goods.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4 flex gap-4">
                {g.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.imageUrl} alt="" className="w-20 h-20 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">{g.type}</p>
                  {g.price != null && (
                    <p className="text-sm text-neon-cyan mt-1">{g.price.toLocaleString()}원</p>
                  )}
                  {g.linkUrl && (
                    <a href={g.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-1 inline-block">
                      링크
                    </a>
                  )}
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    disabled={deletingId === g.id}
                    onClick={() => handleDelete(g.id)}
                    aria-label="굿즈 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {canEdit ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">굿즈 추가 (누구나 편집 가능)</p>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="title" placeholder="제목 *" required className="rounded-xl" />
                <Input name="type" placeholder="종류 (피규어, Blu-ray 등) *" required className="rounded-xl" />
                <Input name="price" type="number" min={0} placeholder="가격 (원)" className="rounded-xl" />
                <Input name="imageUrl" type="url" placeholder="이미지 URL" className="rounded-xl" />
                <Input name="linkUrl" type="url" placeholder="구매 링크" className="rounded-xl sm:col-span-2" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "추가 중..." : "굿즈 등록"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">
          <a
            href={`/auth/signin?callbackUrl=${encodeURIComponent(`/anime/${slug}?tab=goods`)}`}
            className="text-primary hover:underline"
          >
            로그인
          </a>
          하면 굿즈도 추가·삭제할 수 있어요.
        </p>
      )}
    </div>
  );
}
