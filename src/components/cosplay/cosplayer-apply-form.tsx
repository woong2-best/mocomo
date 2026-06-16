"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { applyAsCosplayer } from "@/actions/cosplayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { Camera, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

const BIO_MAX = 300;

type AnimeOption = {
  id: string;
  title: string;
  slug: string;
  characters: string[];
};

export function CosplayerApplyForm({
  animes,
  username,
}: {
  animes: AnimeOption[];
  username: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    linked: boolean;
    anime: { title: string; slug: string };
    character: string;
  } | null>(null);

  const [animeId, setAnimeId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<PostMediaItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const selectedAnime = useMemo(() => animes.find((a) => a.id === animeId), [animes, animeId]);

  const willLink =
    selectedAnime &&
    characterName.trim() &&
    selectedAnime.characters.some((c) => {
      const q = characterName.trim().toLowerCase().replace(/\s+/g, "");
      const n = c.toLowerCase().replace(/\s+/g, "");
      return n === q || n.includes(q) || q.includes(n);
    });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData(e.currentTarget);
    const photoUrl = photo[0]?.url?.trim();
    if (!photoUrl || photoUrl.startsWith("blob:")) {
      setError("대표 사진을 업로드해 주세요.");
      setLoading(false);
      return;
    }

    const res = await applyAsCosplayer({
      stageName: (form.get("stageName") as string) || undefined,
      bio: form.get("bio") as string,
      photoUrl,
      animeId,
      characterName,
    });

    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if (res.success && res.anime) {
      setResult({ linked: res.linked, anime: res.anime, character: res.character! });
      setTimeout(() => router.push(`/cosplay/${username}`), 2500);
    }
  }

  if (result) {
    return (
      <Card className="rounded-2xl border-primary/30">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold">코스어 등록 완료</h2>
          {result.linked ? (
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{result.anime.title}</strong> 애니 페이지 코스어 탭에
              연동되었습니다.
              <br />
              캐릭터: {result.character}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              프로필은 생성되었으나, 선택한 캐릭터가 애니 등장인물 목록과 일치하지 않아 애니 연동은 되지
              않았습니다. 등장인물 이름을 정확히 입력해 수정할 수 있습니다.
            </p>
          )}
          <Link href={`/anime/${result.anime.slug}?tab=cosplayers`}>
            <Button variant="outline" className="rounded-xl">
              애니 코스어 탭 보기
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
          사진 1장 · 자기소개 {BIO_MAX}자 · 코스 애니/캐릭터를 등록하면 해당 애니 페이지에 표시됩니다.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">활동명 (선택)</label>
            <Input name="stageName" placeholder="무대에서 쓰는 이름" className="mt-1 rounded-xl" />
          </div>

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

          <div>
            <label className="text-sm font-medium">코스하는 애니 *</label>
            <select
              value={animeId}
              onChange={(e) => {
                setAnimeId(e.target.value);
                setCharacterName("");
              }}
              required
              className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">애니 선택</option>
              {animes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">코스 캐릭터 *</label>
            {selectedAnime && selectedAnime.characters.length > 0 ? (
              <>
                <select
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  required
                  className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="">캐릭터 선택</option>
                  {selectedAnime.characters.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">목록에 없으면 아래에 직접 입력</p>
                <Input
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="직접 입력"
                  className="mt-2 rounded-xl"
                />
              </>
            ) : (
              <Input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                required
                placeholder="캐릭터 이름"
                className="mt-1 rounded-xl"
              />
            )}
          </div>

          {selectedAnime && characterName && (
            <div
              className={`flex items-start gap-2 text-sm p-3 rounded-xl border ${
                willLink ? "border-green-500/40 bg-green-500/10" : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {willLink ? (
                <Link2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span>
                {willLink ? (
                  <>
                    <strong>{selectedAnime.title}</strong> 등장인물과 일치합니다. 등록 후 애니 페이지
                    「코스어」 탭에 자동 연동됩니다.
                  </>
                ) : (
                  <>
                    이 캐릭터는 <strong>{selectedAnime.title}</strong> 등장인물 목록에 없습니다. 코스어
                    프로필만 생성되고 애니 연동은 되지 않습니다.
                  </>
                )}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={loading || uploadingPhoto || !animeId || photo.length === 0}
          >
            {loading ? "등록 중..." : "코스어 등록하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
