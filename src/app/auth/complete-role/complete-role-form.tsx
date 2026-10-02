"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
import { BrandLogoLockup } from "@/components/brand/brand-logo-lockup";
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
        setError(t("auth.sfxz8kn"));
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
        setError(errorText(res.error));
        return;
      }
      setCosplayers((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, following: !!res.following } : c))
      );
    } catch {
      setError(t("auth.s1k1umdl"));
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
      setError(t("auth.sfxz8kn"));
      setLoading(false);
    }
  }

  async function submitCoser(e: React.FormEvent) {
    e.preventDefault();
    const photoUrl = photo[0]?.url?.trim();
    if (!photoUrl || photoUrl.startsWith("blob:")) {
      setError(t("auth.s1pp1hu7"));
      return;
    }
    if (!bio.trim()) {
      setError(t("auth.s1yjme52"));
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
        setError(errorText(res.error));
        setLoading(false);
      }
    } catch (err) {
      if (isNextNavigationError(err)) throw err;
      setError(t("auth.s1j1q593"));
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
      setError(t("auth.sfxz8kn"));
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <BrandLogoLockup size={72} priority className="mx-auto" />
          <CardTitle className="text-xl font-semibold">
            {step === "role"
              ? t("auth.s1opuphf")
              : step === "fan"
                ? t("auth.sqzfrgk")
                : t("auth.s1jo2ezo")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === "role"
              ? t("auth.s1shaxxo", { v0: BRAND.name })
              : step === "fan"
                ? t("auth.svmzith")
                : t("auth.s1wtktrd")}
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
                  <Sparkles className="h-4 w-4" /> {t("auth.s14bx6fz")}
                </span>
                <span className="text-xs font-normal opacity-90 text-left">
                  {t("auth.sps6cn6")}
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
                  <Heart className="h-4 w-4" /> {t("auth.s15po")}
                </span>
                <span className="text-xs font-normal text-muted-foreground text-left">
                  {t("auth.s1rfhl1b")}
                </span>
              </Button>
            </div>
          ) : null}

          {step === "fan" ? (
            <div className="space-y-3">
              {cosplayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("auth.sdef92r")}
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
                        {c.following ? t("compose.collabFollowing") : t("auth.svtgiw")}
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
                {loading ? "…" : t("seller.next")}
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
                {t("auth.shzb4m0")}
              </button>
            </div>
          ) : null}

          {step === "coser" ? (
            <form onSubmit={(e) => void submitCoser(e)} className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> {t("auth.s1f333s6")}
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
                  <UserRound className="h-4 w-4" />{" "}
                  {t("auth.bioLabel", { current: String(bio.length), max: String(BIO_MAX) })}
                </label>
                <textarea
                  required
                  maxLength={BIO_MAX}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder={t("auth.sz9gkz9")}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={loading || uploadingPhoto || photo.length === 0 || !bio.trim()}
              >
                {loading ? t("auth.skg4uo9") : t("auth.sbmmbh5")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl"
                disabled={loading}
                onClick={() => void skipCoser()}
              >
                {t("auth.s1wxdhd8")}
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
                {t("auth.shzb4m0")}
              </button>
            </form>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          ) : null}

          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            {t("auth.continuePrefix")}{" "}
            <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
              {t("legal.terms")}
            </Link>
            {t("auth.sn9i1xt")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
