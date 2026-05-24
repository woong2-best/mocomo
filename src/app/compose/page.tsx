"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPost } from "@/actions/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = searchParams.get("community") || undefined;
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const tags = (form.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await createPost({
      title: (form.get("title") as string) || undefined,
      content: form.get("content") as string,
      communityId,
      isNsfw: form.get("isNsfw") === "on",
      tagNames: tags,
    });
    setLoading(false);
    if (result.post) router.push(`/post/${result.post.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>글쓰기</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="title" placeholder="제목 (선택)" />
          <textarea
            name="content"
            placeholder="내용을 입력하세요..."
            required
            className="w-full min-h-[200px] rounded-lg border border-border bg-background/50 p-3 text-sm"
          />
          <Input name="tags" placeholder="태그 (쉼표로 구분) 예: 원신, 코스프레" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isNsfw" />
            NSFW
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "게시 중..." : "게시하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ComposePage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <Suspense fallback={<p className="text-muted-foreground">로딩...</p>}>
        <ComposeForm />
      </Suspense>
    </div>
  );
}
