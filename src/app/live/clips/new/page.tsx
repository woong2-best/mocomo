"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");



import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Scissors, Upload } from "lucide-react";
import { createStreamClip } from "@/actions/stream-clip";
import { FileDropZone } from "@/components/media/file-drop-zone";
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
  const [videoPreview, setVideoPreview] = useState("");
  const [thumbPreview, setThumbPreview] = useState("");

  async function ingestVideo(file: File | null) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setVideoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    setLoading(true);
    setError("");
    try {
      const url = await uploadVideoBlob(file, file.name);
      setVideoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n("webtoon-studio.s1vgkz0f"));
    }
    setLoading(false);
  }

  async function ingestThumb(file: File | null) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setThumbPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    try {
      const url = await uploadImageBlob(file, file.name);
      setThumbUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n("app.live.s11ypn9r"));
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
      setError(errorText(res.error));
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={i18n("app.live.s1l5t7t0")} required />
            <FileDropZone
              className="rounded-xl"
              disabled={loading}
              hint={i18n("media.dropHintVideo")}
              onFiles={(files) => {
                void ingestVideo(files[0] ?? null);
              }}
            >
              <label className="file-drop-zone__pad cursor-pointer text-xs text-muted-foreground">
                Video 파일 (R2) 또는 URL
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => {
                    void ingestVideo(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                {videoPreview ? (
                  <video src={videoPreview} className="mt-2 max-h-40 w-full rounded-lg object-contain" muted playsInline />
                ) : (
                  <span className="text-xs font-medium text-foreground">{i18n("media.dropHintVideo")}</span>
                )}
              </label>
            </FileDropZone>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={i18n("app.live.url")}
              required
            />
            <FileDropZone
              className="rounded-xl"
              disabled={loading}
              hint={i18n("media.dropHintImage")}
              onFiles={(files) => {
                void ingestThumb(files[0] ?? null);
              }}
            >
              <label className="file-drop-zone__pad cursor-pointer text-xs text-muted-foreground">
                썸네일 (선택)
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    void ingestThumb(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                {thumbPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbPreview} alt="" className="mt-2 max-h-32 w-full rounded-lg object-contain" />
                ) : (
                  <span className="text-xs font-medium text-foreground">{i18n("media.dropHintImage")}</span>
                )}
              </label>
            </FileDropZone>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isVertical} onChange={(e) => setIsVertical(e.target.checked)} />
              세로형 쇼츠
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading || !videoUrl}>
              <Upload className="h-4 w-4" />
              {loading ? i18n("post.menu.blockReportSubmitting") : i18n("app.live.s1l5pxz7")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppPageChrome>
  );
}
