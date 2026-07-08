"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCommunity } from "@/actions/community-hub";
import { COMMUNITY_CATEGORY_OPTIONS } from "@/lib/community-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Loader2 } from "lucide-react";

export function CommunityCreateForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = new FormData(e.currentTarget);
      const result = await createCommunity({
        name: form.get("name") as string,
        description: (form.get("description") as string) || undefined,
        category: form.get("category") as string,
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

      <Card>
        <CardHeader>
          <CardTitle>새 커뮤니티</CardTitle>
          <p className="text-sm text-muted-foreground">
            생성 후 커뮤니티 홈으로 이동합니다. 글은 상단 「글쓰기」에서 올릴 수 있어요.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="community-name" className="text-sm font-medium">
                커뮤니티 이름
              </label>
              <Input
                id="community-name"
                name="name"
                placeholder="예: 진격의 거인"
                required
                minLength={2}
                maxLength={80}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="community-description" className="text-sm font-medium">
                설명
              </label>
              <textarea
                id="community-description"
                name="description"
                placeholder="어떤 주제의 커뮤니티인지 간단히 적어 주세요"
                className="w-full min-h-[100px] rounded-lg border border-border bg-background/50 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="community-category" className="text-sm font-medium">
                카테고리
              </label>
              <select
                id="community-category"
                name="category"
                className="w-full h-10 rounded-lg border border-border bg-background/50 px-3 text-sm disabled:opacity-60"
                required
                defaultValue="ANIME"
                disabled={loading}
              >
                {COMMUNITY_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isNsfw" disabled={loading} />
              NSFW 커뮤니티
            </label>

            {error && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중…
                </>
              ) : (
                "생성"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
