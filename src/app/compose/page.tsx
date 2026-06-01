"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPost } from "@/actions/community";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaType } from "@prisma/client";

function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = searchParams.get("community") || undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<PostMediaItem[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const tags = (form.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await createPost({
      title: (form.get("title") as string) || undefined,
      content: form.get("content") as string,
      communityId,
      isNsfw: form.get("isNsfw") === "on",
      tagNames: tags,
      media: media.map((m) => ({ url: m.url, type: m.type as MediaType })),
    });
    setLoading(false);
    if (result.post) {
      router.push(`/post/${result.post.id}`);
    } else {
      setError("게시에 실패했습니다. 로그인 상태를 확인하세요.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>글쓰기</CardTitle>
        <p className="text-sm text-muted-foreground">
          사진·영상을 찍거나 고른 뒤, 앱 안에서 자르기·구간 편집할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PostMediaComposer items={media} onChange={setMedia} maxImages={4} maxVideos={1} />
          <Input name="title" placeholder="제목 (선택)" className="rounded-xl" />
          <textarea
            name="content"
            placeholder="내용을 입력하세요..."
            required
            className="w-full min-h-[200px] rounded-xl border border-border bg-background/50 p-3 text-sm"
          />
          <Input name="tags" placeholder="태그 (쉼표로 구분) 예: 원신, 코스프레" className="rounded-xl" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isNsfw" />
            NSFW
          </label>
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? "게시 중..." : "게시하기"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
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
