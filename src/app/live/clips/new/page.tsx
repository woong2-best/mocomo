"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Scissors, Upload } from "lucide-react";
import { createStreamClip } from "@/actions/stream-clip";
import { uploadImageBlob, uploadVideoBlob } from "@/lib/client-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export default function NewClipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");
  const [isVertical, setIsVertical] = useState(true);
  const [error, setError] = useState("");

  async function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const url = await uploadVideoBlob(file, file.name);
      setVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    }
    setLoading(false);
  }

  async function onThumbFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImageBlob(file, file.name);
      setThumbUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "썸네일 업로드 실패");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createStreamClip({
      title,
      videoUrl,
      thumbnailUrl: thumbUrl || undefined,
      isVertical,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.push("/live");
  }

  return (
    <AppPageChrome spacing="sm">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          라이브
        </Button>
      </Link>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-5 w-5" />
            클립 / 쇼츠 업로드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="클립 제목" required />
            <label className="block text-xs text-muted-foreground">
              영상 파일 (R2) 또는 URL
              <input type="file" accept="video/*" className="mt-1 block w-full text-sm" onChange={onVideoFile} />
            </label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="영상 URL"
              required
            />
            <label className="block text-xs text-muted-foreground">
              썸네일 (선택)
              <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={onThumbFile} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isVertical} onChange={(e) => setIsVertical(e.target.checked)} />
              세로형 쇼츠
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading || !videoUrl}>
              <Upload className="h-4 w-4" />
              {loading ? "처리 중…" : "클립 등록"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppPageChrome>
  );
}
