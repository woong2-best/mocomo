"use client";

import { useState } from "react";
import { updateProfile } from "@/actions/profile";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
} from "@/lib/forbidden-admin-sequence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileImageField } from "@/components/profile/profile-image-field";
import Link from "next/link";

type Initial = {
  name: string;
  image: string;
  bio: string;
  bannerUrl: string;
  mainCharacter: string;
  favoriteTags: string;
  location: string;
  website: string;
  showNsfw: boolean;
  username: string;
};

export function ProfileSettingsForm({ initial }: { initial: Initial }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(initial.image);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const displayName = ((form.get("name") as string) || "").trim();
    if (displayName && containsForbiddenAdminSequence(displayName)) {
      setMsg(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
      setLoading(false);
      return;
    }
    const tags = (form.get("favoriteTags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await updateProfile({
      name: (form.get("name") as string) || undefined,
      image: image || undefined,
      bio: (form.get("bio") as string) || undefined,
      bannerUrl: bannerUrl || undefined,
      mainCharacter: (form.get("mainCharacter") as string) || undefined,
      favoriteTags: tags,
      showNsfw: form.get("showNsfw") === "on",
      snsLinks: Object.fromEntries(
        [
          ["location", (form.get("location") as string)?.trim()],
          ["website", (form.get("website") as string)?.trim()],
        ].filter(([, v]) => v)
      ) as Record<string, string>,
    });
    if (result && "error" in result && result.error) {
      setMsg(result.error);
    } else {
      setMsg("저장되었습니다.");
    }
    setLoading(false);
  }

  const displayName = initial.name || initial.username;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
      <Link href="/settings" className="text-sm text-primary hover:underline">
        ← 설정
      </Link>

      <Card className="rounded-2xl overflow-hidden">
        <div
          className="h-28 sm:h-32 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30"
          style={
            bannerUrl
              ? {
                  backgroundImage: `url(${bannerUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        <CardContent className="pt-0 pb-4">
          <div className="flex items-end gap-3 -mt-10">
            <Avatar className="h-20 w-20 ring-4 ring-card">
              <AvatarImage src={image || undefined} />
              <AvatarFallback className="text-xl">{initial.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="pb-1 min-w-0">
              <p className="font-bold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">미리보기</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
          <p className="text-sm text-muted-foreground">
            사진을 올리면 프로필·배너 비율에 맞게 자를 수 있습니다. URL로 직접 넣을 수도 있어요.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <ProfileImageField kind="banner" name="bannerUrl" value={bannerUrl} onChange={setBannerUrl} />
            <ProfileImageField kind="avatar" name="image" value={image} onChange={setImage} />

            <div>
              <label className="text-sm font-medium">표시 이름</label>
              <Input name="name" defaultValue={initial.name} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium">소개</label>
              <textarea
                name="bio"
                defaultValue={initial.bio}
                maxLength={160}
                className="mt-1 w-full min-h-[100px] rounded-xl border border-border bg-background p-3 text-sm"
                placeholder="자기소개 (160자)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">위치</label>
              <Input name="location" defaultValue={initial.location} placeholder="서울, 대한민국" className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium">웹사이트</label>
              <Input name="website" defaultValue={initial.website} placeholder="https://..." className="mt-1 rounded-xl" />
            </div>
            <Input name="mainCharacter" defaultValue={initial.mainCharacter} placeholder="대표 캐릭터" className="rounded-xl" />
            <Input
              name="favoriteTags"
              defaultValue={initial.favoriteTags}
              placeholder="좋아하는 작품 (쉼표 구분)"
              className="rounded-xl"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showNsfw" defaultChecked={initial.showNsfw} />
              NSFW 콘텐츠 표시
            </label>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
            {msg && (
              <p
                className={`text-sm ${
                  msg === FORBIDDEN_ADMIN_SEQUENCE_MESSAGE ? "text-destructive" : "text-primary"
                }`}
              >
                {msg}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
