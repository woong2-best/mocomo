"use client";

import { useState } from "react";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function friendlyPostError(err: unknown, apiError?: string): string {
  if (apiError) return apiError;
  if (err instanceof Error) {
    if (err.message.includes("Server Components render")) {
      return "게시 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return err.message;
  }
  return "연결 오류가 발생했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.";
}

export function ComposeForm({
  communityId,
  variant = "page",
  onPosted,
  onNeedSignIn,
}: {
  communityId?: string;
  variant?: "page" | "sheet";
  onPosted?: () => void;
  onNeedSignIn?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const submitBusy = loading || mediaUploading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!formEl) return;

    const invalidMedia = media.some(
      (m) =>
        m.url.startsWith("blob:") ||
        m.url.startsWith("data:") ||
        (!m.url.startsWith("http") && !m.url.startsWith("/"))
    );
    if (invalidMedia) {
      setError("사진·영상 업로드가 끝난 뒤 다시 시도해 주세요.");
      return;
    }

    const form = new FormData(formEl);
    const tags = (form.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: (form.get("title") as string) || undefined,
      content: form.get("content") as string,
      communityId,
      isNsfw: form.get("isNsfw") === "on",
      tagNames: tags,
      media: media.map((m) => ({ url: m.url, type: m.type })),
    };

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = (await res.json().catch(() => ({}))) as {
        postId?: string;
        error?: string;
      };

      if (!res.ok) {
        const msg = result.error ?? "게시에 실패했습니다.";
        setError(msg);
        if (res.status === 401 || msg.includes("로그인")) {
          onNeedSignIn?.();
        }
        return;
      }

      if (result.postId) {
        onPosted?.();
        return;
      }
      setError(result.error ?? "게시에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } catch (err) {
      console.error("[ComposeForm] createPost", err);
      setError(friendlyPostError(err));
    } finally {
      setLoading(false);
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {variant === "sheet" && (
        <p className="text-sm text-muted-foreground -mt-1">
          사진·영상을 찍거나 고른 뒤, 앱 안에서 자르기·구간 편집할 수 있습니다.
        </p>
      )}
      <PostMediaComposer
        items={media}
        onChange={setMedia}
        maxImages={4}
        maxVideos={1}
        onUploadingChange={setMediaUploading}
      />
      <Input name="title" placeholder="제목 (선택)" className="rounded-xl" />
      <textarea
        name="content"
        placeholder="내용을 입력하세요..."
        required
        className="w-full min-h-[160px] rounded-xl border border-border bg-background/50 p-3 text-sm resize-y"
      />
      <Input
        name="tags"
        placeholder="태그 (쉼표로 구분) 예: 원신, 코스프레"
        className="rounded-xl"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNsfw" />
        NSFW
      </label>
      <Button type="submit" className="w-full rounded-xl" disabled={submitBusy}>
        {mediaUploading ? "업로드 중..." : loading ? "게시 중..." : "게시하기"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );

  if (variant === "sheet") {
    return formBody;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>글쓰기</CardTitle>
        <p className="text-sm text-muted-foreground">
          사진·영상을 찍거나 고른 뒤, 앱 안에서 자르기·구간 편집할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
