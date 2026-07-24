"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCommunity } from "@/actions/community-hub";
import { COMMUNITY_CATEGORY_OPTIONS } from "@/lib/community-labels";
import type { CommunityCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommunityCreateForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<CommunityCategory | "">("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!category) {
      setError("커뮤니티가 속할 카테고리를 선택해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      const result = await createCommunity({
        name: form.get("name") as string,
        description: (form.get("description") as string) || undefined,
        category,
        isNsfw: form.get("isNsfw") === "on",
      });

      if (!result) {
        setError("서버 응답이 없습니다. 로그인 후 다시 시도해 주세요.");
        return;
      }
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("community" in result && result.community?.slug) {
        router.replace(`/c/${result.community.slug}/posts`);
        router.refresh();
        return;
      }

      setError("커뮤니티가 생성되었지만 이동에 실패했습니다. 커뮤니티 목록에서 확인해 주세요.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "요청 중 오류가 발생했습니다. 네트워크와 로그인 상태를 확인해 주세요."
      );
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
        커뮤니티 목록
      </Link>

      <Card className="rounded-md border-[#d5d5d5] shadow-sm">
        <CardHeader className="border-b border-[#e8e8e8] bg-[#f7f7f7] dark:bg-muted/30 dark:border-border">
          <CardTitle className="text-lg">새 커뮤니티</CardTitle>
          <p className="text-sm text-muted-foreground">
            카테고리를 고른 뒤 이름을 정하면 커뮤니티 방이 만들어집니다.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-sm font-semibold">
                  카테고리 <span className="text-[#c80000]">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">필수 · 하나 선택</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {COMMUNITY_CATEGORY_OPTIONS.map((opt) => {
                  const selected = category === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={loading}
                      onClick={() => setCategory(opt.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-sm border px-2.5 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-[#c80000] bg-[#c80000]/5 text-foreground ring-1 ring-[#c80000]/40"
                          : "border-border bg-background hover:border-foreground/30 hover:bg-muted/40",
                        loading && "opacity-60"
                      )}
                    >
                      <span className="text-base leading-none">{opt.emoji}</span>
                      <span className="font-medium">{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              {!category && (
                <p className="text-[11px] text-muted-foreground">위에서 소속 카테고리를 골라 주세요.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="community-name" className="text-sm font-semibold">
                커뮤니티 이름 <span className="text-[#c80000]">*</span>
              </label>
              <Input
                id="community-name"
                name="name"
                placeholder="예: 원신, 홀로라이브, 보컬로이드"
                required
                minLength={2}
                maxLength={80}
                disabled={loading}
                className="rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="community-description" className="text-sm font-semibold">
                설명
              </label>
              <textarea
                id="community-description"
                name="description"
                placeholder="어떤 주제의 커뮤니티인지 한 줄로 적어 주세요"
                className="w-full min-h-[96px] rounded-sm border border-border bg-background/50 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                disabled={loading}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isNsfw" disabled={loading} />
              NSFW 커뮤니티
            </label>

            {error && (
              <p className="text-sm text-destructive rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full rounded-sm" disabled={loading || !category}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중…
                </>
              ) : (
                "커뮤니티 만들기"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
