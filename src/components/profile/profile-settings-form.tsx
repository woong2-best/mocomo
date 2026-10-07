"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { sanitizeBirthDigitInput } from "@/lib/birth-date";
import { ProfileStreamingSettings } from "@/components/profile/profile-streaming-settings";
import type { StreamingAccountPublic } from "@/lib/streaming-accounts/types";

function clampBirthDigits(e: React.FormEvent<HTMLInputElement>, maxLength: number) {
  const el = e.currentTarget;
  const next = sanitizeBirthDigitInput(el.value, maxLength);
  if (el.value !== next) el.value = next;
}

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
  showYoutubeOnProfile: boolean;
  showTwitchOnProfile: boolean;
};

export function ProfileSettingsForm({
  initial,
  cosplayerProfile,
  streamingAccounts = [],
}: {
  initial: Initial;
  cosplayerProfile: { username: string; photos: CosplayGalleryPhoto[] } | null;
  streamingAccounts?: StreamingAccountPublic[];
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(initial.image);
  const router = useRouter();
  const sessionState = useSession();
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [bannerVideoUrl, setBannerVideoUrl] = useState(initial.bannerVideoUrl);

  async function publishMedia(patch: { image?: string | null; bannerUrl?: string | null; bannerVideoUrl?: string | null }) {
    const result = await updateProfile(patch);
    if (result && "error" in result && result.error) {
      setMsg(errorText(result.error));
      return;
    }
    await sessionState?.update?.();
    router.refresh();
  }

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
      setMsg(t("lib.profile.update.service.s5e994a2425"));
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
      setMsg(t("profile.s1i8t4hd"));
      setLoading(false);
      return;
    }

    const result = await updateProfile({
      username: usernameChanged ? username : undefined,
      name: displayName || undefined,
      image: image || null,
      bio: (form.get("bio") as string) || undefined,
      bannerUrl: bannerVideoUrl ? null : bannerUrl || null,
      bannerVideoUrl: bannerVideoUrl || null,
      mainCharacter: (form.get("mainCharacter") as string) || undefined,
      favoriteTags: tags,
      showNsfw: form.get("showNsfw") === "on",
      showBirthdayOnProfile: form.get("showBirthdayOnProfile") === "on",
      showYoutubeOnProfile: form.get("showYoutubeOnProfile") === "on",
      showTwitchOnProfile: form.get("showTwitchOnProfile") === "on",
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
      setMsg(errorText(result.error));
    } else {
      await sessionState?.update?.();
      window.dispatchEvent(new Event("mocomo-money-age-refresh"));
      router.refresh();
      setMsg(t("profile.s12la3bm"));
    }
    setLoading(false);
  }

  const displayName = initial.name || initial.username;
  const usernameLocked = initial.usernameChangesRemaining <= 0;
  const resetText = initial.usernameChangeResetAt
    ? new Date(initial.usernameChangeResetAt).toLocaleString("en-US")
    : null;

  return (
    <AppPageChrome spacing="sm">
      <Link href="/settings" className="text-sm text-primary hover:underline">
        {t("profile.s49ct8h")}
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
              <p className="text-xs text-muted-foreground">{t("support.sohlxtc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileStreamingSettings
        accounts={streamingAccounts}
        showYoutubeOnProfile={initial.showYoutubeOnProfile}
        showTwitchOnProfile={initial.showTwitchOnProfile}
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("settings.editProfile")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("profile.sk80a7t")}
          </p>
        </CardHeader>
        <CardContent>
          <form id="profile-settings-form" onSubmit={handleSubmit} className="space-y-5">
            <ProfileBannerField
              bannerUrl={bannerUrl}
              bannerVideoUrl={bannerVideoUrl}
              onBannerUrlChange={(url) => {
                setBannerUrl(url);
                if (url.includes("/storage/v1/object/")) {
                  setBannerVideoUrl("");
                  void publishMedia({ bannerUrl: url, bannerVideoUrl: null });
                }
              }}
              onBannerVideoUrlChange={(url) => {
                setBannerVideoUrl(url);
                if (url.includes("/storage/v1/object/")) {
                  setBannerUrl("");
                  void publishMedia({ bannerUrl: null, bannerVideoUrl: url });
                }
              }}
            />
            <ProfileImageField
              kind="avatar"
              name="image"
              value={image}
              onChange={(url) => {
                setImage(url);
                if (url.includes("/storage/v1/object/")) void publishMedia({ image: url });
              }}
            />

            <div>
              <label className="text-sm font-medium">{t("profile.s2jy9bk")}</label>
              <Input name="name" defaultValue={initial.name} className="mt-1 rounded-xl" />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("profile.s155sabx")}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">{t("auth.emailLocalPart")}</label>
              <div className="mt-1 flex items-stretch overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <span className="flex shrink-0 items-center pl-3 pr-1 text-sm text-muted-foreground select-none">
                  @
                </span>
                <Input
                  name="username"
                  defaultValue={initial.username}
                  disabled={usernameLocked}
                  pattern="[A-Za-z0-9_]{3,20}"
                  autoComplete="username"
                  className="h-10 min-w-0 flex-1 border-0 bg-transparent pl-0 pr-3 shadow-none rounded-none rounded-r-xl focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("profile.usernamePolicy", {
                  limit: USERNAME_CHANGE_LIMIT,
                  days: USERNAME_CHANGE_WINDOW_DAYS,
                  remaining: initial.usernameChangesRemaining,
                })}
                {usernameLocked && resetText ? ` ${t("profile.svpdcpy")} ${resetText}` : ""}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">{t("profile.sxv68")}</label>
              <textarea
                name="bio"
                defaultValue={initial.bio}
                maxLength={160}
                className="mt-1 w-full min-h-[100px] rounded-xl border border-border bg-background p-3 text-sm"
                placeholder={t("profile.160")}
              />
            </div>
            <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/20">
              <div>
                <label className="text-sm font-medium">{t("profile.sxwe7")}</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {initial.birthYear && initial.birthMonth && initial.birthDay
                    ? t("profile.birthDateLocked")
                    : t("profile.sda4pyn")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-2 pt-1">
                <div className="min-w-0">
                  <label className="block text-xs leading-normal text-muted-foreground">{t("profile.synkk")}</label>
                  <Input
                    name="birthYear"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="bday-year"
                    defaultValue={initial.birthYear}
                    placeholder="YYYY"
                    maxLength={4}
                    readOnly={!!(initial.birthYear && initial.birthMonth && initial.birthDay)}
                    onInput={(e) => clampBirthDigits(e, 4)}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs leading-normal text-muted-foreground">{t("lib.webtoon.s139w")}</label>
                  <Input
                    name="birthMonth"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="bday-month"
                    defaultValue={initial.birthMonth}
                    placeholder="MM"
                    maxLength={2}
                    readOnly={!!(initial.birthYear && initial.birthMonth && initial.birthDay)}
                    onInput={(e) => clampBirthDigits(e, 2)}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs leading-normal text-muted-foreground">{t("lib.webtoon.s13ek")}</label>
                  <Input
                    name="birthDay"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="bday-day"
                    defaultValue={initial.birthDay}
                    placeholder="DD"
                    maxLength={2}
                    readOnly={!!(initial.birthYear && initial.birthMonth && initial.birthDay)}
                    onInput={(e) => clampBirthDigits(e, 2)}
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
                {t("profile.smsesf1")}
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">{t("profile.syzf8")}</label>
              <Input name="location" defaultValue={initial.location} placeholder={t("profile.s1nzjqhp")} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("profile.spwnk5z")}</label>
              <Input name="website" defaultValue={initial.website} placeholder="https://..." className="mt-1 rounded-xl" />
            </div>
            <Input name="mainCharacter" defaultValue={initial.mainCharacter} placeholder={t("profile.sav9khb")} className="rounded-xl" />
            <Input
              name="favoriteTags"
              defaultValue={initial.favoriteTags}
              placeholder={t("profile.scpx4gr")}
              className="rounded-xl"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showNsfw" defaultChecked={initial.showNsfw} />
              {t("profile.nsfw")}
            </label>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? t("auth.saving") : t("settings.save")}
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
            <CardTitle>{t("profile.sb9u3dk")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("profile.s1hfjx15")}
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/cosplay/apply">{t("profile.sg5pv6o")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </AppPageChrome>
  );
}
