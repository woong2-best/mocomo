"use client";

import { useState } from "react";
import Link from "next/link";
import {
  completeSignupRoleCoser,
  completeSignupRoleFan,
  followOnboardingCosplayer,
  skipSignupRoleCoser,
} from "@/actions/signup-role-onboarding";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BRAND } from "@/lib/brand";
import { isNextNavigationError } from "@/lib/next-navigation-error";
import type { OnboardingCosplayerItem } from "@/lib/signup-role-onboarding";
import { Camera, Heart, Sparkles, UserRound } from "lucide-react";

const BIO_MAX = 300;

type Role = "fan" | "coser";
type Step = "role" | "fan" | "coser";

export function CompleteRoleOnboardingForm({
  dest,
  alreadyCoser,
  initialCosplayers,
}: {
  dest?: string;
  alreadyCoser: boolean;
  initialCosplayers: OnboardingCosplayerItem[];
}) {
  const [step, setStep] = useState<Step>("role");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cosplayers, setCosplayers] = useState(initialCosplayers);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<PostMediaItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function chooseRole(role: Role) {
    setError("");
    if (role === "fan") {
      setStep("fan");
      return;
    }
    if (alreadyCoser) {
      setLoading(true);
      try {
        await skipSignupRoleCoser({ dest });
      } catch (e) {
        if (isNextNavigationError(e)) throw e;
        setError("계속 진행에 실패했습니다. 다시 시도해 주세요.");
        setLoading(false);
      }
      return;
    }
    setStep("coser");
  }

  async function onFollow(userId: string) {
    setFollowBusyId(userId);
    setError("");
    try {
      const res = await followOnboardingCosplayer(userId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setCosplayers((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, following: !!res.following } : c))
      );
    } catch {
      setError("팔로우에 실패했습니다.");
    } finally {
      setFollowBusyId(null);
    }
  }

  async function finishFan() {
    setLoading(true);
    setError("");
    try {
      await completeSignupRoleFan({ dest });
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("계속 진행에 실패했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  async function submitCoser(e: React.FormEvent) {
    e.preventDefault();
    const photoUrl = photo[0]?.url?.trim();
    if (!photoUrl || photoUrl.startsWith("blob:")) {
      setError("대표 사진을 업로드해 주세요.");
      return;
    }
    if (!bio.trim()) {
      setError("자기소개를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await completeSignupRoleCoser({
        bio: bio.trim(),
        photoUrl,
        dest,
      });
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err) {
      if (isNextNavigationError(err)) throw err;
      setError("등록에 실패했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  async function skipCoser() {
    setLoading(true);
    setError("");
    try {
      await skipSignupRoleCoser({ dest });
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("계속 진행에 실패했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">
            {step === "role"
              ? "어떤 방식으로 즐기시나요?"
              : step === "fan"
                ? "코스어를 팔로우해 보세요"
                : "컬쳐위키 코스어 등록"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === "role"
              ? `${BRAND.name}에서 팬으로 응원할지, 코스어로 활동할지 골라 주세요.`
              : step === "fan"
                ? "관심 있는 코스어를 팔로우하면 홈에서 더 쉽게 만날 수 있어요."
                : "사진과 소개만 입력하면 컬쳐위키 코스어로 바로 등록됩니다. (페이지 이동 없음)"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {step === "role" ? (
            <div className="grid gap-3">
              <Button
                type="button"
                className="h-auto rounded-2xl py-4 flex flex-col items-start gap-1"
                onClick={() => void chooseRole("coser")}
                disabled={loading}
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4" /> 코스어 / 크리에이터
                </span>
                <span className="text-xs font-normal opacity-90 text-left">
                  컬쳐위키에 코스어 프로필을 등록하고 활동을 시작해요
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-2xl py-4 flex flex-col items-start gap-1"
                onClick={() => void chooseRole("fan")}
                disabled={loading}
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Heart className="h-4 w-4" /> 팬
                </span>
                <span className="text-xs font-normal text-muted-foreground text-left">
                  좋아하는 코스어를 팔로우하며 즐겨요
                </span>
              </Button>
            </div>
          ) : null}

          {step === "fan" ? (
            <div className="space-y-3">
              {cosplayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  아직 등록된 코스어가 없어요. 나중에 컬쳐위키에서 찾아볼 수 있습니다.
                </p>
              ) : (
                <ul className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                  {cosplayers.map((c) => (
                    <li
                      key={c.userId}
                      className="flex items-center gap-3 rounded-xl border border-border p-2.5"
                    >
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={c.photoUrl || c.image || undefined} />
                        <AvatarFallback>
                          {(c.displayName || c.username).slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{c.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={c.following ? "secondary" : "default"}
                        className="rounded-xl shrink-0"
                        disabled={followBusyId === c.userId || c.following}
                        onClick={() => void onFollow(c.userId)}
                      >
                        {c.following ? "팔로잉" : "팔로우"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                className="w-full rounded-xl"
                disabled={loading}
                onClick={() => void finishFan()}
              >
                {loading ? "…" : "다음"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:underline"
                disabled={loading}
                onClick={() => {
                  setStep("role");
                  setError("");
                }}
              >
                역할 다시 선택
              </button>
            </div>
          ) : null}

          {step === "coser" ? (
            <form onSubmit={(e) => void submitCoser(e)} className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> 대표 사진 *
                </label>
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
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" /> 자기소개 * ({bio.length}/{BIO_MAX})
                </label>
                <textarea
                  required
                  maxLength={BIO_MAX}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="코스 스타일, 좋아하는 작품, 행사 일정 등"
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={loading || uploadingPhoto || photo.length === 0 || !bio.trim()}
              >
                {loading ? "등록 중…" : "코스어 등록하고 계속"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl"
                disabled={loading}
                onClick={() => void skipCoser()}
              >
                나중에 등록하고 계속
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:underline"
                disabled={loading}
                onClick={() => {
                  setStep("role");
                  setError("");
                }}
              >
                역할 다시 선택
              </button>
            </form>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          ) : null}

          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            계속하면{" "}
            <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
              이용약관
            </Link>
            에 동의한 것으로 간주됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
