"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import type { FastSearchResult } from "@/lib/search-fast";

export function HomeInPageSearch({ query }: { query: string }) {
  const q = query.trim();
  const search = useQuery({
    queryKey: ["home-search", q],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as FastSearchResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "검색에 실패했습니다.");
      return json;
    },
    staleTime: 15_000,
  });

  if (search.isLoading) return <CardRowsSkeleton rows={8} />;
  if (search.isError || !search.data) {
    return <p className="text-sm text-muted-foreground">검색에 실패했습니다.</p>;
  }

  const { users, posts } = search.data;

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        「<span className="font-medium text-foreground">{q}</span>」 결과
      </p>
      {users.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">사람</h2>
          <div className="space-y-1">
            {users.map((u) => (
              <PrefetchLink
                key={u.username}
                href={`/u/${u.username}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50"
              >
                <span className="font-medium">{u.name?.trim() || u.username}</span>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
              </PrefetchLink>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">게시물</h2>
        {posts.length === 0 && <p className="text-xs text-muted-foreground">없음</p>}
        {posts.map((p) => (
          <PrefetchLink key={p.id} href={`/post/${p.id}`}>
            <Card className="mb-2 hover:border-primary/30">
              <CardContent className="p-3 text-sm line-clamp-2">{p.title || p.content}</CardContent>
            </Card>
          </PrefetchLink>
        ))}
      </section>
      {users.length === 0 && posts.length === 0 && (
        <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        <Link href={`/search?q=${encodeURIComponent(q)}&scope=social`} className="hover:underline">
          전체 검색 →
        </Link>
      </p>
    </>
  );
}
