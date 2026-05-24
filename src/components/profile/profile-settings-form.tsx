"use client";

import { useState } from "react";
import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
};

export function ProfileSettingsForm({ initial }: { initial: Initial }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const tags = (form.get("favoriteTags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await updateProfile({
      name: (form.get("name") as string) || undefined,
      image: (form.get("image") as string) || undefined,
      bio: (form.get("bio") as string) || undefined,
      bannerUrl: (form.get("bannerUrl") as string) || undefined,
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
    setMsg("저장되었습니다.");
    setLoading(false);
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <Link href="/settings" className="text-sm text-primary hover:underline">
        ← 설정
      </Link>
      <Link href="/settings/profile" className="block text-xs text-muted-foreground">
        프로필 미리보기는 저장 후 내 프로필에서 확인
      </Link>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
          <p className="text-sm text-muted-foreground">트위터처럼 이름·사진·배너·소개를 꾸밀 수 있어요.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">표시 이름</label>
              <Input name="name" defaultValue={initial.name} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium">프로필 사진 URL</label>
              <Input name="image" type="url" defaultValue={initial.image} placeholder="https://..." className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium">배너 이미지 URL</label>
              <Input name="bannerUrl" type="url" defaultValue={initial.bannerUrl} placeholder="https://..." className="mt-1 rounded-xl" />
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
            <Input name="mainCharacter" defaultValue={initial.mainCharacter} placeholder="대표 캐릭터" />
            <Input name="favoriteTags" defaultValue={initial.favoriteTags} placeholder="좋아하는 작품 (쉼표 구분)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showNsfw" defaultChecked={initial.showNsfw} />
              NSFW 콘텐츠 표시
            </label>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
            {msg && <p className="text-sm text-primary">{msg}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
