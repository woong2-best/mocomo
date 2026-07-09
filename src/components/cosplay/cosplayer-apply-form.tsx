"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyAsCosplayer } from "@/actions/cosplayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { Camera, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const BIO_MAX = 300;

export function CosplayerApplyForm({ username }: { username: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<PostMediaItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const photoUrl = photo[0]?.url?.trim();
    if (!photoUrl || photoUrl.startsWith("blob:")) {
      setError("대표 사진을 업로드해 주세요.");
      setLoading(false);
      return;
    }

    const res = await applyAsCosplayer({
      bio,
      photoUrl,
    });

    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if (res.success) {
      setDone(true);
      setTimeout(() => router.push(`/cosplay/${username}`), 2000);
    }
  }

  if (done) {
    return (
      <Card className="rounded-2xl border-primary/30">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold">코스어 등록 완료</h2>
          <p className="text-sm text-muted-foreground">
            프로필 설정에서 코스 작품·캐릭터를 추가할 수 있습니다.
          </p>
          <Link href={`/cosplay/${username}`}>
            <Button variant="outline" className="rounded-xl">
              내 코스어 페이지 보기
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-pink-500" />
          코스어 신청
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          닉네임·프사는 프로필 설정에서 수정합니다. 여기서는 대표 코스 사진과 활동 소개만
          등록합니다. 코스 작품·캐릭터는 등록 후 프로필에서 추가할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">대표 사진 * (1장만)</label>
            <PostMediaComposer
              className="mt-2"
              items={photo}
              onChange={setPhoto}
              maxImages={1}
              maxVideos={0}
              allowVideo={false}
              quickUpload
              disabled={loading}
              onUploadingChange={setUploadingPhoto}
            />
            <p className="text-xs text-muted-foreground mt-1">
              갤러리에서 선택하거나 카메라로 촬영해 업로드하세요.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">자기소개 * ({bio.length}/{BIO_MAX}자)</label>
            <textarea
              name="bio"
              required
              maxLength={BIO_MAX}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="코스 스타일, 좋아하는 작품, 행사 일정 등"
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={loading || uploadingPhoto || photo.length === 0 || !bio.trim()}
          >
            {loading ? "등록 중..." : "코스어 등록하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
