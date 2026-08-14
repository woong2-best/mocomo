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
import { ProfileBannerField } from "@/components/profile/profile-banner-field";
import { ProfileBannerMedia } from "@/components/profile/profile-banner-media";
import { ProfileImageField } from "@/components/profile/profile-image-field";
import {
  USERNAME_CHANGE_LIMIT,
  USERNAME_CHANGE_WINDOW_DAYS,
  isValidUsername,
  normalizeUsername,
} from "@/lib/username-policy";
import {
  CosplayGallerySettings,
  type CosplayGalleryPhoto,
} from "@/components/profile/cosplay-gallery-settings";
import Link from "next/link";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

type Initial = {
  name: string;
  image: string;
  bio: string;
  bannerUrl: string;
  bannerVideoUrl: string;
  mainCharacter: string;
  favoriteTags: string;
  location: string;
  website: string;
  showNsfw: boolean;
  username: string;
  usernameChangesRemaining: number;
  usernameChangeResetAt: string | null;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  showBirthdayOnProfile: boolean;
};

export function ProfileSettingsForm({
  initial,
  cosplayerProfile,
}: {
  initial: Initial;
  cosplayerProfile: { username: string; photos: CosplayGalleryPhoto[] } | null;
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(initial.image);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [bannerVideoUrl, setBannerVideoUrl] = useState(initial.bannerVideoUrl);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const displayName = ((form.get("name") as string) || "").trim();
    const usernameRaw = ((form.get("username") as string) || initial.username).trim();
    const username = normalizeUsername(usernameRaw);
    const usernameChanged = username !== normalizeUsername(initial.username);
    if (usernameChanged && !isValidUsername(username)) {
      setMsg("아이디는 영문·숫자·_ 3~20자입니다.");
      setLoading(false);
      return;
    }
    if (displayName && containsForbiddenAdminSequence(displayName)) {
      setMsg(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
      setLoading(false);
      return;
    }
    const tags = (form.get("favoriteTags") as string)
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const birthYearStr = (form.get("birthYear") as string)?.trim() ?? "";
    const birthMonthStr = (form.get("birthMonth") as string)?.trim() ?? "";
    const birthDayStr = (form.get("birthDay") as string)?.trim() ?? "";
    const clearBirth = !birthYearStr && !birthMonthStr && !birthDayStr;
    const hasPartial =
      (birthYearStr || birthMonthStr || birthDayStr) &&
      !(birthYearStr && birthMonthStr && birthDayStr);
    if (hasPartial) {
      setMsg("생년월일은 연·월·일을 모두 입력하거나, 모두 비워 주세요.");
      setLoading(false);
      return;
    }

    const result = await updateProfile({
      username: usernameChanged ? username : undefined,
      name: displayName || undefined,
      image: image || undefined,
      bio: (form.get("bio") as string) || undefined,
      bannerUrl: bannerVideoUrl ? undefined : bannerUrl || undefined,
      bannerVideoUrl: bannerVideoUrl || undefined,
      mainCharacter: (form.get("mainCharacter") as string) || undefined,
      favoriteTags: tags,
      showNsfw: form.get("showNsfw") === "on",
      showBirthdayOnProfile: form.get("showBirthdayOnProfile") === "on",
      ...(clearBirth
        ? { clearBirthDate: true }
        : {
            birthYear: Number(birthYearStr),
            birthMonth: Number(birthMonthStr),
            birthDay: Number(birthDayStr),
          }),
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
  const usernameLocked = initial.usernameChangesRemaining <= 0;
  const resetText = initial.usernameChangeResetAt
    ? new Date(initial.usernameChangeResetAt).toLocaleString("ko-KR")
    : null;

  return (
    <AppPageChrome spacing="sm">
      <Link href="/settings" className="text-sm text-primary hover:underline">
        ← 설정
      </Link>

      <Card className="rounded-2xl overflow-hidden">
        <div className="h-28 sm:h-32 overflow-hidden relative">
          <ProfileBannerMedia bannerUrl={bannerUrl} bannerVideoUrl={bannerVideoUrl} active />
        </div>
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
            사진·동영상 배너는 마이페이지와 앱 왼쪽 메뉴에 표시됩니다. 동영상은 무음 자동 재생, 최대 10초.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <ProfileBannerField
              bannerUrl={bannerUrl}
              bannerVideoUrl={bannerVideoUrl}
              onBannerUrlChange={setBannerUrl}
              onBannerVideoUrlChange={setBannerVideoUrl}
            />
            <ProfileImageField kind="avatar" name="image" value={image} onChange={setImage} />

            <div>
              <label className="text-sm font-medium">표시 이름</label>
              <Input name="name" defaultValue={initial.name} className="mt-1 rounded-xl" />
              <p className="mt-1 text-xs text-muted-foreground">
                닉네임은 언제든지 변경할 수 있습니다.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">아이디</label>
              <div className="mt-1 flex rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <span className="flex items-center pl-3 text-sm text-muted-foreground">@</span>
                <Input
                  name="username"
                  defaultValue={initial.username}
                  disabled={usernameLocked}
                  pattern="[A-Za-z0-9_]{3,20}"
                  className="border-0 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                아이디는 영문·숫자·_ 3~20자이며, {USERNAME_CHANGE_WINDOW_DAYS}일에{" "}
                {USERNAME_CHANGE_LIMIT}번만 변경할 수 있습니다. 남은 변경{" "}
                {initial.usernameChangesRemaining}회
                {usernameLocked && resetText ? ` · 다음 가능 시간: ${resetText}` : ""}
              </p>
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
            <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/20">
              <div>
                <label className="text-sm font-medium">생일</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  중고거래 성인 인증에도 사용됩니다. 프로필에는 월·일만 공개할 수 있어요.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">연도</label>
                  <Input
                    name="birthYear"
                    type="number"
                    defaultValue={initial.birthYear}
                    placeholder="1998"
                    min={1900}
                    max={new Date().getFullYear()}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">월</label>
                  <Input
                    name="birthMonth"
                    type="number"
                    defaultValue={initial.birthMonth}
                    placeholder="3"
                    min={1}
                    max={12}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">일</label>
                  <Input
                    name="birthDay"
                    type="number"
                    defaultValue={initial.birthDay}
                    placeholder="15"
                    min={1}
                    max={31}
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="showBirthdayOnProfile"
                  defaultChecked={initial.showBirthdayOnProfile}
                  disabled={!initial.birthYear && !initial.birthMonth && !initial.birthDay}
                />
                프로필에 생일 표시 (월·일)
              </label>
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

      {cosplayerProfile ? (
        <CosplayGallerySettings
          username={cosplayerProfile.username}
          initialPhotos={cosplayerProfile.photos}
        />
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>코스프레 갤러리</CardTitle>
            <p className="text-sm text-muted-foreground">
              코스어로 등록하면 코스프레 사진을 올리고 갤러리를 관리할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/cosplay/apply">코스어 등록하기</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </AppPageChrome>
  );
}
